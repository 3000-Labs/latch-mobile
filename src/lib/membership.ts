/**
 * membership.ts — shared-wallet discovery: announce on create, poll on launch.
 *
 * A device only ever sees shared wallets it created or manually added; this lets
 * a second signer's device auto-discover wallets it was added to. The creator
 * announces, for each on-chain member, a row keyed by the member's BLIND id
 * (`membershipBlindId` — a one-way hash of the member's public signer key). A
 * joining device computes its own blind id, lists its wallets, and adds them by
 * the public C-address. Discovery is advisory: `addSharedWalletByAddress`
 * re-verifies on-chain that this device is actually a signer before trusting it,
 * so a forged announcement can't inject a wallet.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';

import { fetchDefaultContextRule } from '@/src/api/account-admin';
import { announceMemberships, listMemberships } from '@/src/api/memberships';
import { STELLAR_NETWORK_PASSPHRASE, STELLAR_RPC_URL } from '@/src/constants/config';
import { addSharedWalletByAddress } from '@/src/lib/add-shared-wallet';
import { getMySignerKey, pickSigner } from '@/src/lib/cosign-packet-flow';
import { ensureWalletSession } from '@/src/lib/wallet-auth';
import { useWalletStore } from '@/src/store/wallet';

const MEMBERSHIP_SCHEME = 'latch-membership:v1:';

function simParams() {
  return {
    rpcUrl: STELLAR_RPC_URL,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    factoryAddress: process.env.EXPO_PUBLIC_FACTORY_ADDRESS ?? '',
  };
}

/**
 * One-way blind id for a member's on-chain signer key (ed25519 pubkey hex or
 * webauthn key_data hex). Both the creator (reads the key on-chain) and the
 * member (knows its own key) derive the same value, so the server never needs
 * the raw key to route a membership.
 */
export function membershipBlindId(keyDataHex: string): string {
  return Buffer.from(
    sha256(new TextEncoder().encode(MEMBERSHIP_SCHEME + keyDataHex.toLowerCase())),
  ).toString('hex');
}

/**
 * Announce a freshly-created shared wallet to every on-chain device-key member
 * so their devices can discover it. Fire-and-forget after deploy; non-fatal.
 */
export async function announceMembership(account: string): Promise<void> {
  const me = pickSigner();
  if (!me) return;

  const rule = await fetchDefaultContextRule(simParams(), account);
  const blindIds = rule.signers
    .filter((s) => (s.kind === 'ed25519' || s.kind === 'webauthn') && s.keyDataHex)
    .map((s) => membershipBlindId(s.keyDataHex));
  if (blindIds.length === 0) return;

  const token = await ensureWalletSession(me.account);
  await announceMemberships(token, account, blindIds);
}

/**
 * Discover shared wallets this device was added to and add the ones not already
 * present. Returns the number newly added. Each add re-verifies on-chain
 * membership, so forged announcements are rejected.
 */
export async function discoverSharedWallets(): Promise<number> {
  const me = pickSigner();
  if (!me) return 0;
  const myKey = await getMySignerKey();
  if (!myKey) return 0;

  const token = await ensureWalletSession(me.account);
  const wallets = await listMemberships(token, membershipBlindId(myKey));

  const known = new Set(
    useWalletStore
      .getState()
      .accounts.map((a) => a.smartAccountAddress)
      .filter((a): a is string => !!a),
  );

  let added = 0;
  for (const w of wallets) {
    if (known.has(w.wallet_ref)) continue;
    try {
      await addSharedWalletByAddress(w.wallet_ref);
      added += 1;
    } catch (e) {
      if (__DEV__) console.log('[membership] skip discovered wallet', w.wallet_ref, e);
    }
  }
  return added;
}
