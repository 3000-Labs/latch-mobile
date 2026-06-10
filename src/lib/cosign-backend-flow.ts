/**
 * cosign-backend-flow.ts — the encrypted-backend transport for multisig
 * approvals (docs/multisig-encrypted-queue.md, Phase 2 step 4).
 *
 * Same signing core as the P2P path (buildAssembledTransfer / signSharedEntry /
 * aggregateAndSubmit + the AUTHORITATIVE on-chain threshold read), but the
 * pending request lives in the wallet-backend queue instead of a local packet.
 * Payloads are E2E-encrypted by src/api/cosign.ts (the WCK never reaches the
 * server). Every function returns a CosignPacket-shaped object so the UI
 * (cosign-review / use-pending-packets) is identical across transports.
 *
 * Auth: the email-scope Latch JWT (ACCESS_TOKEN). The cosign endpoints accept
 * it (Phase A1); the wallet-scope token is for the personal account and isn't
 * needed here. No refresh-on-401 yet — surfaced as an error for now.
 */

import * as SecureStore from 'expo-secure-store';

import {
  addCosignSignature,
  cancelCosignRequest,
  CosignApiError,
  createCosignRequest,
  getCosignRequest,
  listCosignRequests,
  markCosignSubmitted,
  type CosignRequest,
} from '@/src/api/cosign';
import { ACTIVE_NETWORK } from '@/src/constants/config';
import type { CosignPacket } from '@/src/lib/cosign-packet';
import {
  type CreateTransferPacketParams,
  getMySignerKey,
  onChainThreshold,
  pickSigner,
} from '@/src/lib/cosign-packet-flow';
import { aggregateAndSubmit, buildAssembledTransfer, signSharedEntry } from '@/src/lib/multisig-send';
import { SECURE_KEYS, useWalletStore } from '@/src/store/wallet';

const NETWORK: 'testnet' | 'mainnet' = ACTIVE_NETWORK.network === 'TESTNET' ? 'testnet' : 'mainnet';

async function token(): Promise<string> {
  const t = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  if (!t) {
    throw new Error('Sign in with email to use the shared inbox (no access token on this device).');
  }
  return t;
}

/** Adapt a decrypted backend request into the transport-agnostic packet shape. */
function toPacket(r: CosignRequest): CosignPacket {
  return {
    v: 1,
    id: r.id,
    network: r.network === 'mainnet' ? 'mainnet' : 'testnet',
    smartAccountAddress: r.smartAccountAddress,
    unsignedTxXdr: r.unsignedTxXdr,
    threshold: r.threshold,
    signatures: r.signatures.map((s) => ({ signerKey: s.signerKey, authEntryXdr: s.authEntryXdr })),
    // The backend tracks expiry as expiresAt (ISO); the ledger number isn't
    // stored. Unused downstream (display uses createdAt; submit re-reads chain).
    expiresLedger: 0,
    createdAt: r.createdAt,
  };
}

export async function createTransferRequest(p: CreateTransferPacketParams): Promise<CosignPacket> {
  const account = p.multisigAccount.smartAccountAddress;
  if (!account) throw new Error('This shared wallet is not deployed yet.');
  const me = pickSigner();
  if (!me) throw new Error('No personal account on this device to sign with.');

  const t = await token();
  const threshold = await onChainThreshold(account);
  const assembled = await buildAssembledTransfer({
    multisigAddress: account,
    sacContractId: p.sacContractId,
    destinationAddress: p.destinationAddress,
    amount: p.amount,
  });

  let req = await createCosignRequest(t, {
    smartAccountAddress: account,
    unsignedTxXdr: assembled.unsignedTxXdr,
    network: NETWORK,
    threshold,
  });

  // Sign our own member entry and attach it.
  const entry = await signSharedEntry(
    assembled.unsignedTxXdr,
    me.account,
    me.listIndex,
    useWalletStore.getState().mnemonic,
  );
  req = await addCosignSignature(t, req.id, account, entry.signerKey, entry.authEntryXdr);
  return toPacket(req);
}

export async function getRequest(id: string): Promise<CosignPacket | null> {
  const t = await token();
  try {
    return toPacket(await getCosignRequest(t, id));
  } catch (e) {
    if (e instanceof CosignApiError && e.status === 404) return null;
    throw e;
  }
}

export async function approveRequest(id: string): Promise<CosignPacket> {
  const t = await token();
  const req = await getCosignRequest(t, id);
  const me = pickSigner();
  if (!me) throw new Error('No personal account on this device to sign with.');

  const myKey = await getMySignerKey();
  if (myKey && req.signatures.some((s) => s.signerKey === myKey)) {
    throw new Error('You have already approved this transfer.');
  }

  const entry = await signSharedEntry(
    req.unsignedTxXdr,
    me.account,
    me.listIndex,
    useWalletStore.getState().mnemonic,
  );
  const updated = await addCosignSignature(
    t,
    id,
    req.smartAccountAddress,
    entry.signerKey,
    entry.authEntryXdr,
  );
  return toPacket(updated);
}

/**
 * Submit once threshold is met, then mark the request submitted. The gate
 * re-reads the threshold from chain (defense in depth, same as the P2P path).
 */
export async function submitRequest(id: string): Promise<{ hash: string }> {
  const t = await token();
  const req = await getCosignRequest(t, id);
  const threshold = await onChainThreshold(req.smartAccountAddress);
  if (req.signatures.length < threshold) {
    throw new Error(`Not enough approvals yet (${req.signatures.length}/${threshold}).`);
  }
  const { hash } = await aggregateAndSubmit(req.unsignedTxXdr, req.signatures);
  await markCosignSubmitted(t, id, hash);
  return { hash };
}

/** All pending requests for one shared wallet (decrypted, packet-shaped). */
export async function listForAccount(account: string): Promise<CosignPacket[]> {
  const t = await token();
  const reqs = await listCosignRequests(t, account);
  return reqs.map(toPacket);
}

export async function cancelRequest(id: string): Promise<void> {
  await cancelCosignRequest(await token(), id);
}
