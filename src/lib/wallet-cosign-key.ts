/**
 * wallet-cosign-key.ts — the Wallet Cosign Key (WCK) lifecycle
 * (docs/multisig-encrypted-queue.md, Phase 2 step 2).
 *
 * One 32-byte AES key per shared wallet, held by every member, that the backend
 * never sees. Generated at wallet creation, cached in SecureStore keyed by the
 * smart-account address, and bootstrapped to other members over a trusted
 * channel via a latch://cosign-key deep link.
 *
 * Sensitive material → SecureStore only (never AsyncStorage). The key is stored
 * as hex; hex is also the link param encoding (URL-safe, no base64 padding).
 */

import * as SecureStore from 'expo-secure-store';

import { fetchDefaultContextRule } from '@/src/api/account-admin';
import { STELLAR_NETWORK_PASSPHRASE, STELLAR_RPC_URL } from '@/src/constants/config';
import { generateWalletCosignKey } from '@/src/lib/cosign-crypto';
import { getMySignerKey } from '@/src/lib/cosign-packet-flow';

const WCK_PREFIX = 'latch_wck_';
const KEY_LEN = 32;

function simParams() {
  return {
    rpcUrl: STELLAR_RPC_URL,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    factoryAddress: process.env.EXPO_PUBLIC_FACTORY_ADDRESS ?? '',
  };
}

// ─── hex codec (storage + link param) ────────────────────────────────────────

function bytesToHex(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
  return s;
}

function hexToBytes(h: string): Uint8Array {
  const clean = h.trim().toLowerCase();
  if (clean.length % 2 !== 0 || /[^0-9a-f]/.test(clean)) {
    throw new Error('wallet-cosign-key: invalid hex');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Encode a WCK for the latch://cosign-key `wck` param (hex is URL-safe). */
export function encodeWck(wck: Uint8Array): string {
  return bytesToHex(wck);
}

// ─── storage ─────────────────────────────────────────────────────────────────

export async function getWalletCosignKey(account: string): Promise<Uint8Array | null> {
  const hex = await SecureStore.getItemAsync(WCK_PREFIX + account);
  return hex ? hexToBytes(hex) : null;
}

async function setWalletCosignKey(account: string, wck: Uint8Array): Promise<void> {
  if (wck.length !== KEY_LEN) throw new Error('wallet-cosign-key: WCK must be 32 bytes');
  await SecureStore.setItemAsync(WCK_PREFIX + account, bytesToHex(wck));
}

export async function hasWalletCosignKey(account: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(WCK_PREFIX + account)) !== null;
}

/**
 * Return the wallet's WCK, generating + persisting one if absent. Called at
 * wizard creation by the creator (the first member to hold the key).
 */
export async function ensureWalletCosignKey(account: string): Promise<Uint8Array> {
  const existing = await getWalletCosignKey(account);
  if (existing) return existing;
  const wck = generateWalletCosignKey();
  await setWalletCosignKey(account, wck);
  return wck;
}

// ─── bootstrap import (member-checked) ───────────────────────────────────────

/**
 * Import a WCK received over a latch://cosign-key link. Stores it ONLY if this
 * device is actually a signer on `account` on-chain — otherwise a stray/forged
 * link can't plant a key for a wallet you're not in. Throws with a user-facing
 * message on any failure.
 */
export async function importWalletCosignKey(account: string, wckParam: string): Promise<void> {
  const wck = hexToBytes(wckParam);
  if (wck.length !== KEY_LEN) throw new Error('Invalid wallet key (must be 32 bytes).');

  const myKey = await getMySignerKey();
  if (!myKey) throw new Error('No signing key on this device.');

  const rule = await fetchDefaultContextRule(simParams(), account);
  const mine = myKey.toLowerCase();
  const isMember = rule.signers.some((s) => s.keyDataHex && s.keyDataHex.toLowerCase() === mine);
  if (!isMember) {
    throw new Error("This device isn't a signer on that shared wallet, so it can't hold its key.");
  }

  await setWalletCosignKey(account, wck);
}
