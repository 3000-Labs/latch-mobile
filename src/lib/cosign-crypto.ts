/**
 * cosign-crypto.ts — client-side E2E encryption for the backend cosign queue
 * (docs/multisig-encrypted-queue.md, Phase 2 step 1).
 *
 * AES-256-GCM via react-native-quick-crypto. The server stores only the
 * ciphertext envelope; the Wallet Cosign Key (WCK) never leaves member devices.
 * Each ciphertext is bound to the smart-account address via GCM AAD, so a blob
 * can't be replayed under a different account, and any tampering (ciphertext,
 * IV, tag, or AAD) makes decrypt throw.
 *
 * Plaintext is always an ASCII base64 XDR string (unsignedTxXdr / authEntryXdr).
 * Envelope:  "v1:" + base64url( iv[12] || ciphertext || tag[16] )
 *
 * base64 uses the polyfill-safe toBase64 (btoa) + a hand-rolled decoder, NEVER
 * Buffer.toString('base64') — that's broken under Hermes (see
 * docs/multisig-encrypted-queue.md and the RN toXDR base64 note). All byte I/O
 * stays in native Uint8Array, since QuickCrypto rejects the RN Buffer polyfill.
 */

import QuickCrypto from 'react-native-quick-crypto';

import { toBase64 } from '@/src/api/smart-account';

const VERSION = 'v1';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// ─── byte helpers (native Uint8Array only) ───────────────────────────────────

function u8(x: ArrayBufferView | ArrayBuffer): Uint8Array {
  if (x instanceof Uint8Array) return x;
  if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  return new Uint8Array(x);
}

// QuickCrypto's TS types demand Buffer for setAAD/setAuthTag, but its native
// bindings accept any TypedArray — and the RN Buffer *polyfill* is what gets
// rejected at the native boundary (the same trap that forced @noble/hashes for
// hashing). So we pass real Uint8Array at runtime and bridge the type to
// whatever the call site expects (inferred), avoiding the two-Buffer-types clash.
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

// Plaintext (base64 XDR) and the account AAD are ASCII, so a charCode walk is
// exact — avoids TextEncoder/TextDecoder, which the RN polyfill renders unevenly.
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

// ─── public API ──────────────────────────────────────────────────────────────

/** A fresh 32-byte Wallet Cosign Key. */
export function generateWalletCosignKey(): Uint8Array {
  return u8(QuickCrypto.randomBytes(KEY_LEN));
}

/**
 * Encrypt an ASCII payload (base64 XDR) under the wallet key, bound to the
 * smart-account address via AAD. Returns the versioned base64url envelope.
 */
export function encryptForWallet(wck: Uint8Array, plaintext: string, account: string): string {
  if (wck.length !== KEY_LEN) throw new Error('cosign-crypto: WCK must be 32 bytes');
  const iv = u8(QuickCrypto.randomBytes(IV_LEN));
  const cipher = QuickCrypto.createCipheriv('aes-256-gcm', wck, iv);
  cipher.setAAD(bridge(asciiToBytes(account)));
  const ct = concat(u8(cipher.update(asciiToBytes(plaintext))), u8(cipher.final()));
  const tag = u8(cipher.getAuthTag());
  return `${VERSION}:${bytesToB64url(concat(iv, ct, tag))}`;
}

/**
 * Decrypt a "v1:" envelope back to the ASCII payload. Throws on a bad version,
 * a short envelope, or any integrity failure (wrong key, wrong account AAD, or
 * tampered ciphertext/IV/tag) — GCM verification fails closed.
 */
export function decryptForWallet(wck: Uint8Array, envelope: string, account: string): string {
  if (wck.length !== KEY_LEN) throw new Error('cosign-crypto: WCK must be 32 bytes');
  const sep = envelope.indexOf(':');
  if (sep < 0 || envelope.slice(0, sep) !== VERSION) {
    throw new Error('cosign-crypto: unsupported envelope version');
  }
  const all = b64urlToBytes(envelope.slice(sep + 1));
  if (all.length < IV_LEN + TAG_LEN) throw new Error('cosign-crypto: envelope too short');
  const iv = all.slice(0, IV_LEN);
  const tag = all.slice(all.length - TAG_LEN);
  const ct = all.slice(IV_LEN, all.length - TAG_LEN);
  const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', wck, iv);
  decipher.setAAD(bridge(asciiToBytes(account)));
  decipher.setAuthTag(bridge(tag));
  return bytesToAscii(concat(u8(decipher.update(ct)), u8(decipher.final())));
}
