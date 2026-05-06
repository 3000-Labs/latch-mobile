/**
 * passkey-webauthn.ts — React Native re-engineering of the Latch web WebAuthn library.
 *
 * Mirrors /lib/webauthn.ts from the web project but replaces browser WebAuthn APIs
 * (@simplewebauthn/browser) with:
 *   - react-native-quick-crypto — P-256 key generation + SHA-256 hashing
 *   - crypto.subtle (polyfilled by react-native-quick-crypto install()) — ECDSA signing
 *   - expo-secure-store with requireAuthentication: true — private key stored in the
 *     iOS Keychain / Android Keystore with biometric access control (Secure Enclave-
 *     backed on iPhone). Reading the key triggers the native Face ID / Touch ID prompt.
 *
 * The on-chain WebAuthn verifier validates:
 *   secp256r1_verify(pubKey, SHA256(authenticatorData || SHA256(clientDataJSON)), signature)
 *
 * We replicate browser behaviour by constructing authenticatorData and clientDataJSON
 * manually and signing with the stored P-256 private key.
 *
 * All base64 / base64url encoding uses btoa() with an explicit byte loop to avoid the
 * Buffer polyfill bug where Buffer.toString('base64') can emit "0,255,..." in React Native.
 */

import { SECURE_KEYS } from '@/src/store/wallet';
import { Address, hash, xdr } from '@stellar/stellar-sdk';
import * as SecureStore from 'expo-secure-store';
import QuickCrypto from 'react-native-quick-crypto';
import { hashSorobanAuthPayload } from './soroban-auth-payload';

// ─── secp256r1 curve order for low-S normalisation ───────────────────────────

const SECP256R1_N = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');

// ─── base64url helpers (btoa-based — no Buffer polyfill) ─────────────────────

export function b64uEncode(data: Uint8Array | string): string {
  const bytes =
    typeof data === 'string'
      ? new TextEncoder().encode(data)
      : new Uint8Array(data instanceof Uint8Array ? data : new Uint8Array(data));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function b64uDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Key generation ───────────────────────────────────────────────────────────

export interface PasskeyCredential {
  /** hex-encoded random credential ID (16 bytes → 32 hex chars) */
  credentialId: string;
  /** 65-byte uncompressed P-256 pubkey hex + credentialId hex (≥132 hex chars total) */
  keyDataHex: string;
  /** P-256 private key hex (32 bytes → 64 hex chars) */
  privateKeyHex: string;
  /** uncompressed P-256 public key hex (65 bytes → 130 hex chars, starts with 04) */
  publicKeyHex: string;
}

/**
 * Generate a new P-256 passkey credential on-device.
 *
 * Call this AFTER biometric consent is confirmed.  Immediately after, store
 * the private key with biometric protection (requireAuthentication: true) via
 * storePasskeyCredential() so that all future signing requires Face ID / Touch ID.
 */
export function createPasskeyCredential(): PasskeyCredential {
  const ecdh = QuickCrypto.createECDH('prime256v1');
  ecdh.generateKeys();

  const publicKeyHex = (
    ecdh.getPublicKey() as unknown as { toString(enc: string): string }
  ).toString('hex');
  const privateKeyHex = (
    ecdh.getPrivateKey() as unknown as { toString(enc: string): string }
  ).toString('hex');
  const credentialId = (
    QuickCrypto.randomBytes(16) as unknown as { toString(enc: string): string }
  ).toString('hex');
  const keyDataHex = publicKeyHex + credentialId;

  return { credentialId, keyDataHex, privateKeyHex, publicKeyHex };
}

/**
 * Persist a passkey credential to SecureStore.
 *
 * Biometric path (requireBiometric = true):
 *   The private key is stored with requireAuthentication: true — protected in the
 *   iOS Keychain / Android Keystore with biometric access control (Secure Enclave
 *   on iPhone). Every read triggers a Face ID / Touch ID prompt automatically.
 *
 * PIN-only path (requireBiometric = false):
 *   The private key is stored with WHEN_PASSCODE_SET_THIS_DEVICE_ONLY on iOS —
 *   hardware-backed Keychain entry tied to passcode existence, never backed up to
 *   iCloud, and wiped if the device passcode is removed. On Android the key lands
 *   in the hardware Keystore without an additional auth gate; the app-level PIN is
 *   the security boundary.
 *
 * The public material (credentialId, keyDataHex) is stored without any protection
 * so it can be read freely for deployment and address lookup.
 */
export async function storePasskeyCredential(
  credential: PasskeyCredential,
  requireBiometric = true,
): Promise<void> {
  // Public material — never auth-gated
  await SecureStore.setItemAsync(SECURE_KEYS.CREDENTIAL_ID, credential.credentialId);
  await SecureStore.setItemAsync(SECURE_KEYS.KEY_DATA_HEX, credential.keyDataHex);

  // Auth mode flag — read back by signWithStoredPasskey to pick the right read options
  await SecureStore.setItemAsync(
    SECURE_KEYS.PASSKEY_REQUIRES_BIOMETRIC,
    requireBiometric ? 'true' : 'false',
  );

  if (requireBiometric) {
    await SecureStore.setItemAsync(SECURE_KEYS.PASSKEY_PRIVATE_KEY, credential.privateKeyHex, {
      requireAuthentication: true,
      authenticationPrompt: 'Authenticate to access your Latch wallet',
    });
  } else {
    // Hardware-backed on iOS: key exists only while device has a passcode set.
    // On Android: key is in hardware Keystore, accessible without additional auth.
    await SecureStore.setItemAsync(SECURE_KEYS.PASSKEY_PRIVATE_KEY, credential.privateKeyHex, {
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });
  }
}

// ─── Signing ──────────────────────────────────────────────────────────────────

export interface PasskeySignature {
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
  /** 64-byte compact P-256 signature (r || s, low-S normalised) */
  signature: Uint8Array;
}

/**
 * Sign an auth digest using a P-256 private key, constructing the WebAuthn
 * authenticatorData and clientDataJSON exactly as the browser would produce them.
 *
 * Verifier checks:
 *   secp256r1_verify(pubKey, SHA256(authData || SHA256(clientData)), sig)
 *
 * We pass (authData || SHA256(clientData)) to crypto.subtle.sign, which
 * computes SHA256 internally before signing.
 *
 * @param privateKeyHex  Stored P-256 private key (64 hex chars)
 * @param publicKeyHex   Stored P-256 uncompressed public key (130 hex chars, 0x04 prefix)
 * @param authDigest     32-byte auth digest the passkey must commit to
 * @param rpId           Relying party ID used as origin and for rpIdHash in authenticatorData
 */
export async function signWithPasskey(
  privateKeyHex: string,
  publicKeyHex: string,
  authDigest: Uint8Array,
  rpId: string,
): Promise<PasskeySignature> {
  // ── authenticatorData: rpIdHash(32) + flags(1) + signCount(4) ─────────────
  const rpIdHashRaw = QuickCrypto.createHash('sha256')
    .update(rpId)
    .digest() as unknown as Uint8Array;
  const rpIdHash = new Uint8Array(rpIdHashRaw);
  const flags = new Uint8Array([0x05]); // UP=1, UV=1 (user presence + verification)
  const signCount = new Uint8Array([0x00, 0x00, 0x00, 0x00]); // always 0 for soft keys

  const authenticatorData = new Uint8Array(37);
  authenticatorData.set(rpIdHash, 0);
  authenticatorData.set(flags, 32);
  authenticatorData.set(signCount, 33);

  // ── clientDataJSON: type, challenge (= base64url(authDigest)), origin ──────
  const challenge = b64uEncode(authDigest);
  const clientDataJSON = new TextEncoder().encode(
    JSON.stringify({ type: 'webauthn.get', challenge, origin: rpId }),
  );

  // ── message = authData || SHA256(clientData) — subtle.sign hashes it again ─
  const clientDataHashRaw = QuickCrypto.createHash('sha256')
    .update(clientDataJSON)
    .digest() as unknown as Uint8Array;
  const clientDataHash = new Uint8Array(clientDataHashRaw);

  const messageToSign = new Uint8Array(authenticatorData.length + clientDataHash.length);
  messageToSign.set(authenticatorData, 0);
  messageToSign.set(clientDataHash, authenticatorData.length);

  // ── Import P-256 private key as JWK for crypto.subtle ─────────────────────
  const privBytes = hexToBytes(privateKeyHex); // 32 bytes
  const pubBytes = hexToBytes(publicKeyHex); // 65 bytes (0x04 || x || y)

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: b64uEncode(privBytes),
    x: b64uEncode(pubBytes.slice(1, 33)),
    y: b64uEncode(pubBytes.slice(33, 65)),
  };

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  // crypto.subtle.sign(ECDSA, SHA-256) computes SHA256(messageToSign) internally
  const sigArrayBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    messageToSign,
  );

  // Output is IEEE P1363 (r || s, 64 bytes) — apply low-S normalisation
  const signature = normalizeToLowS(new Uint8Array(sigArrayBuffer));

  return { authenticatorData, clientDataJSON, signature };
}

/**
 * Sign using the passkey stored in SecureStore.
 *
 * Biometric users: reading the private key triggers Face ID / Touch ID automatically
 * (key was stored with requireAuthentication: true / Secure Enclave on iOS).
 *
 * PIN-only users: key is read without a biometric prompt — it was stored with
 * WHEN_PASSCODE_SET_THIS_DEVICE_ONLY (hardware-backed but no auth prompt on read).
 * The app-level PIN already gated access to this code path.
 *
 * @param authDigest   32-byte auth digest to sign
 * @param rpId         Relying party ID (e.g. "latch.finance")
 * @param promptMsg    Message shown in the biometric prompt (biometric path only)
 */
export async function signWithStoredPasskey(
  authDigest: Uint8Array,
  rpId: string,
  promptMsg = 'Authenticate to sign this transaction',
): Promise<PasskeySignature> {
  const requiresBiometric = await SecureStore.getItemAsync(SECURE_KEYS.PASSKEY_REQUIRES_BIOMETRIC);
  // Default to biometric if the flag is absent (accounts created before this change)
  const useBiometric = requiresBiometric !== 'false';

  const privateKeyHex = await SecureStore.getItemAsync(
    SECURE_KEYS.PASSKEY_PRIVATE_KEY,
    useBiometric ? { requireAuthentication: true, authenticationPrompt: promptMsg } : undefined,
  );

  if (!privateKeyHex) {
    throw new Error('No passkey found. Please complete biometric setup first.');
  }

  // Public key is the first 130 hex chars of keyDataHex (65 bytes uncompressed)
  const keyDataHex = await SecureStore.getItemAsync(SECURE_KEYS.KEY_DATA_HEX);
  if (!keyDataHex) {
    throw new Error('Key data missing. Please complete biometric setup first.');
  }
  const publicKeyHex = keyDataHex.slice(0, 130);

  return signWithPasskey(privateKeyHex, publicKeyHex, authDigest, rpId);
}

// ─── Auth digest ──────────────────────────────────────────────────────────────

/**
 * Compute the 32-byte auth digest the passkey must sign.
 * Mirrors computeAuthDigest() from the web library.
 *
 * auth_digest = SHA256(signaturePayload || contextRuleIds.toXDR())
 */
export function computeAuthDigest(
  authEntry: xdr.SorobanAuthorizationEntry,
  networkPassphrase: string,
  contextRuleIds: number[],
): Uint8Array {
  const signaturePayload = hashSorobanAuthPayload(authEntry, networkPassphrase);
  const ruleIdsXdr = new Uint8Array(
    xdr.ScVal.scvVec(contextRuleIds.map((id) => xdr.ScVal.scvU32(id))).toXDR(),
  );
  const combined = new Uint8Array(signaturePayload.length + ruleIdsXdr.length);
  combined.set(signaturePayload, 0);
  combined.set(ruleIdsXdr, signaturePayload.length);
  return new Uint8Array(hash(Buffer.from(combined)));
}

// ─── XDR encoding ─────────────────────────────────────────────────────────────

/**
 * Encode PasskeySignature as the XDR bytes the on-chain WebAuthn verifier expects.
 *
 * WebAuthnSigData { authenticator_data: Bytes, client_data: Bytes, signature: BytesN<64> }
 */
export function encodeWebAuthnSigData(sig: PasskeySignature): Uint8Array {
  return new Uint8Array(
    xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('authenticator_data'),
        val: xdr.ScVal.scvBytes(Buffer.from(sig.authenticatorData)),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('client_data'),
        val: xdr.ScVal.scvBytes(Buffer.from(sig.clientDataJSON)),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('signature'),
        val: xdr.ScVal.scvBytes(Buffer.from(sig.signature)),
      }),
    ]).toXDR(),
  );
}

/**
 * Build the full AuthPayload ScVal for the on-chain smart account.
 *
 * AuthPayload { context_rule_ids: Vec<u32>, signers: Map<Signer, Bytes> }
 */
export function buildWebAuthnAuthPayload(
  verifierAddress: string,
  keyDataHex: string,
  sigDataXdr: Uint8Array,
  contextRuleIds: number[],
): xdr.ScVal {
  const signerKey = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('External'),
    xdr.ScVal.scvAddress(Address.fromString(verifierAddress).toScAddress()),
    xdr.ScVal.scvBytes(Buffer.from(keyDataHex, 'hex')),
  ]);

  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('context_rule_ids'),
      val: xdr.ScVal.scvVec(contextRuleIds.map((id) => xdr.ScVal.scvU32(id))),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('signers'),
      val: xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: signerKey,
          val: xdr.ScVal.scvBytes(Buffer.from(sigDataXdr)),
        }),
      ]),
    }),
  ]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function normalizeToLowS(sig: Uint8Array): Uint8Array {
  const r = sig.slice(0, 32);
  let s = BigInt(
    '0x' +
      Array.from(sig.slice(32))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
  );

  if (s > SECP256R1_N / 2n) {
    s = SECP256R1_N - s;
  }

  const sHex = s.toString(16).padStart(64, '0');
  const sBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) sBytes[i] = parseInt(sHex.slice(i * 2, i * 2 + 2), 16);

  const result = new Uint8Array(64);
  result.set(r, 0);
  result.set(sBytes, 32);
  return result;
}
