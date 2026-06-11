/**
 * sealed-wck.ts — distribute a shared wallet's WCK to members WITHOUT a trusted
 * side channel (docs/multisig-encrypted-queue.md).
 *
 * The key is sealed to each member's on-chain ed25519 signer key via an X25519
 * ECIES box (ephemeral ECDH → HKDF-SHA256 → AES-256-GCM). A `bundle` packs one
 * sealed copy per member into a single blob, so the SAME link can be posted over
 * ANY channel (even a group chat): only the intended member's device can open
 * its entry, and non-members can't open any. This replaces the raw-key link,
 * which required a trusted channel because it carried the secret in the clear.
 *
 * Ed25519 members only — passkey (P-256) members are skipped, deferred with the
 * rest of the passkey path. Byte I/O stays native Uint8Array (QuickCrypto rejects
 * the RN Buffer polyfill); base64 via the polyfill-safe toBase64, never
 * Buffer.toString('base64').
 */

import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import QuickCrypto from 'react-native-quick-crypto';

import { toBase64 } from '@/src/api/smart-account';

const HKDF_INFO = 'latch-wck-seal-v1';
const IV_LEN = 12;
const TAG_LEN = 16;
const EPH_LEN = 32;
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// ─── byte helpers (native Uint8Array only) ───────────────────────────────────

function u8(x: ArrayBufferView | ArrayBuffer): Uint8Array {
  if (x instanceof Uint8Array) return x;
  if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  return new Uint8Array(x);
}

// QuickCrypto's TS types want Buffer for setAuthTag, but its native bindings
// accept any TypedArray (and reject the RN Buffer polyfill). Pass real
// Uint8Array; bridge the type to the inferred call-site expectation.
function bridge<T>(x: Uint8Array): T {
  return x as unknown as T;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function hexToBytes(h: string): Uint8Array {
  const clean = h.trim().toLowerCase();
  if (clean.length % 2 !== 0 || /[^0-9a-f]/.test(clean)) throw new Error('sealed-wck: invalid hex');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function asciiToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function bytesToAscii(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

function bytesToB64url(b: Uint8Array): string {
  return toBase64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s: string): Uint8Array {
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const val = B64URL.indexOf(s[i]);
    if (val < 0) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

// ─── ECIES box (X25519 → HKDF → AES-256-GCM) ─────────────────────────────────

function deriveKey(shared: Uint8Array): Uint8Array {
  return hkdf(sha256, shared, undefined, asciiToBytes(HKDF_INFO), 32);
}

/** Seal `wck` to a member's 32-byte ed25519 public key (hex). */
export function sealWckToEd25519(wck: Uint8Array, recipientEdPubHex: string): string {
  const xPub = ed25519.utils.toMontgomery(hexToBytes(recipientEdPubHex));
  const ephSec = x25519.utils.randomSecretKey();
  const ephPub = x25519.getPublicKey(ephSec);
  const key = deriveKey(x25519.getSharedSecret(ephSec, xPub));

  const iv = u8(QuickCrypto.randomBytes(IV_LEN));
  const cipher = QuickCrypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = concat(u8(cipher.update(bridge(wck))), u8(cipher.final()));
  const tag = u8(cipher.getAuthTag());
  return bytesToB64url(concat(ephPub, iv, ct, tag));
}

/** Open an envelope sealed to my ed25519 key, using my 32-byte ed25519 seed. */
export function openWckFromEd25519(envelope: string, myEdSeed: Uint8Array): Uint8Array {
  const all = b64urlToBytes(envelope);
  if (all.length < EPH_LEN + IV_LEN + TAG_LEN) throw new Error('sealed-wck: envelope too short');
  const ephPub = all.slice(0, EPH_LEN);
  const iv = all.slice(EPH_LEN, EPH_LEN + IV_LEN);
  const tag = all.slice(all.length - TAG_LEN);
  const ct = all.slice(EPH_LEN + IV_LEN, all.length - TAG_LEN);

  const xSec = ed25519.utils.toMontgomerySecret(myEdSeed);
  const key = deriveKey(x25519.getSharedSecret(xSec, ephPub));

  const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(bridge(tag));
  return concat(u8(decipher.update(bridge(ct))), u8(decipher.final()));
}

// ─── bundle (one link, sealed per member) ─────────────────────────────────────

export interface WckRecipient {
  /** Member's ed25519 signer key (the on-chain keyDataHex). */
  keyDataHex: string;
}

interface BundleEntry {
  k: string; // recipient keyDataHex (lowercase) — match tag
  e: string; // sealed envelope
}

/** Pack the WCK sealed to every recipient into one base64url bundle blob. */
export function buildWckBundle(wck: Uint8Array, recipients: WckRecipient[]): string {
  const entries: BundleEntry[] = recipients.map((r) => ({
    k: r.keyDataHex.toLowerCase(),
    e: sealWckToEd25519(wck, r.keyDataHex),
  }));
  return bytesToB64url(asciiToBytes(JSON.stringify({ v: 1, entries })));
}

/**
 * Open my entry in a bundle. Returns the WCK, or null if no entry is sealed for
 * `myKeyDataHex` (i.e. the bundle wasn't meant for this device).
 */
export function openWckBundle(
  bundle: string,
  myKeyDataHex: string,
  myEdSeed: Uint8Array,
): Uint8Array | null {
  const parsed = JSON.parse(bytesToAscii(b64urlToBytes(bundle)));
  if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.entries)) {
    throw new Error('sealed-wck: malformed bundle');
  }
  const mine = (parsed.entries as BundleEntry[]).find((x) => x.k === myKeyDataHex.toLowerCase());
  if (!mine) return null;
  return openWckFromEd25519(mine.e, myEdSeed);
}
