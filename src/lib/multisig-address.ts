/**
 * multisig-address.ts — deterministic salt derivation and address
 * prediction for at-deploy multisig wallets.
 *
 * Onboarding-time multisig requires all participating devices to know
 * the smart account's C-address *before* it deploys: joiner devices
 * need to know which account to monitor, and the deploy itself uses
 * the salt to lock in the address.
 *
 * Convention:
 *   salt = sha256( "latch-multisig-v1" || threshold || sorted_canonical_keys )
 *
 * Sorting the canonical signer keys before hashing makes the salt
 * independent of the order signers were paired in — only the SET of
 * signers matters. The version tag isolates this scheme from any
 * future salt convention so addresses don't collide across versions.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';

import { AccountSigner } from '@/src/lib/account-signers';

const SCHEME = 'latch-multisig-v1';
const MEMBERSHIP_SCHEME = 'latch-multisig-membership-v1';

export interface MultisigDeployIdentity {
  signers: AccountSigner[];
  threshold: number;
  /**
   * Optional per-wallet uniqueness nonce (hex). When present it's folded into
   * the salt, so an identical signer set + threshold still deploys to a fresh
   * C-address — letting the same members open multiple distinct shared wallets.
   * Absent ⇒ the original deterministic salt (back-compat).
   */
  nonceHex?: string;
}

export function canonicalSignerKey(signer: AccountSigner): string {
  switch (signer.kind) {
    case 'ed25519':
      return `ed25519:${signer.publicKeyHex}`;
    case 'webauthn':
      return `webauthn:${signer.keyDataHex}`;
    case 'delegated':
      return `delegated:${signer.address}`;
  }
}

/**
 * Compute the deterministic 32-byte salt for a (signer set, threshold)
 * pair. Sorts signer keys lexicographically before hashing so all
 * participating devices produce the same salt regardless of the order
 * they paired in.
 */
export function deriveMultisigSalt(id: MultisigDeployIdentity): Buffer {
  if (id.signers.length < 1) throw new Error('deriveMultisigSalt: at least one signer required');
  if (id.threshold < 1 || id.threshold > id.signers.length) {
    throw new Error(
      `deriveMultisigSalt: threshold ${id.threshold} out of range for ${id.signers.length} signers`,
    );
  }
  const sortedKeys = id.signers.map(canonicalSignerKey).sort();
  const parts = [SCHEME, String(id.threshold), ...sortedKeys];
  if (id.nonceHex) parts.push(`nonce:${id.nonceHex}`);
  return Buffer.from(sha256(new TextEncoder().encode(parts.join('|'))));
}

/** A fresh 16-byte uniqueness nonce (hex) for a new shared wallet's salt. */
export function generateMultisigNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('hex');
}

/**
 * Stable local fingerprint of a shared wallet's "who + how many" — sorted member
 * identifiers + threshold. Independent of the deploy nonce, so it stays the same
 * across multiple wallets with the same members; used only to detect (and warn
 * about) re-creating a wallet with an identical member set.
 */
export function multisigMembershipHash(memberIds: string[], threshold: number): string {
  const sorted = memberIds.map((m) => m.trim()).filter(Boolean).sort();
  const payload = [MEMBERSHIP_SCHEME, String(threshold), ...sorted].join('|');
  return Buffer.from(sha256(new TextEncoder().encode(payload))).toString('hex');
}

/**
 * Sorted, deduped signer list used for both salt derivation and the
 * actual factory deploy. Sorting here means the on-chain signer ordering
 * doesn't depend on pair order either — purely a function of the set.
 */
export function sortSignersCanonical(signers: AccountSigner[]): AccountSigner[] {
  const seen = new Set<string>();
  const out: AccountSigner[] = [];
  for (const s of signers) {
    const k = canonicalSignerKey(s);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  out.sort((a, b) => {
    const ka = canonicalSignerKey(a);
    const kb = canonicalSignerKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return out;
}
