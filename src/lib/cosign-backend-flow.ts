/**
 * cosign-backend-flow.ts — the encrypted-backend transport for multisig
 * approvals (docs/multisig-encrypted-queue.md). Lets members fetch pending
 * transactions for a shared wallet asynchronously, without anyone sharing a
 * packet.
 *
 * Same signing core as the P2P path (buildAssembledTransfer / signSharedEntry /
 * aggregateAndSubmit + the AUTHORITATIVE on-chain threshold read). This module
 * owns ALL the crypto: it encrypts payloads with the wallet's WCK, derives the
 * blind queue_index / blind_signer_id, and resolves which of the device's
 * wallets a fetched request belongs to (by matching its queue_index). The server
 * (src/api/cosign.ts) only ever sees ciphertext + opaque blind ids.
 *
 * Auth: a wallet-scope Latch JWT minted by wallet-auth.ts against the SAME
 * backend (EXPO_PUBLIC_API_BASE_URL). Every Latch user has this (wallet control,
 * no email required); it authenticates as the device's PERSONAL account, never
 * the multisig. No refresh-on-401 yet.
 */

import {
  addCosignSignature,
  cancelCosignRequest,
  CosignApiError,
  createCosignRequest,
  getCosignRequest,
  listCosignRequests,
  markCosignSubmitted,
  type CosignRequestRaw,
} from '@/src/api/cosign';
import { ACTIVE_NETWORK } from '@/src/constants/config';
import { blindSignerId, decryptForWallet, encryptForWallet, queueIndexFor } from '@/src/lib/cosign-crypto';
import type { CosignPacket } from '@/src/lib/cosign-packet';
import {
  getMySignerKey,
  onChainThreshold,
  pickSigner,
  type CreateTransferPacketParams,
} from '@/src/lib/cosign-packet-flow';
import {
  aggregateAndSubmit,
  buildAssembledTransfer,
  signSharedEntry,
  type CollectedEntry,
} from '@/src/lib/multisig-send';
import { ensureWalletSession } from '@/src/lib/wallet-auth';
import {
  autoFetchWalletCosignKey,
  ensureWalletCosignKey,
  getWalletCosignKey,
} from '@/src/lib/wallet-cosign-key';
import { useWalletStore } from '@/src/store/wallet';

const NETWORK: 'testnet' | 'mainnet' = ACTIVE_NETWORK.network === 'TESTNET' ? 'testnet' : 'mainnet';

/**
 * A valid latch-api JWT for the cosign endpoints — the device's PERSONAL
 * wallet-scope session (cached, or minted via challenge/sign-in by wallet-auth).
 * Authenticates as the personal account that signs, NOT the multisig (which has
 * no single key and 404s on challenge). Cosign endpoints don't use the identity
 * for scoping (blind queue_index) — any valid token suffices.
 */
async function token(): Promise<string> {
  const me = pickSigner();
  if (!me) {
    throw new Error('No personal account on this device to authenticate with.');
  }
  return ensureWalletSession(me.account);
}

interface ResolvedWallet {
  address: string;
  wck: Uint8Array;
}

/**
 * Identify which of this device's shared wallets a fetched request belongs to,
 * by matching its (opaque) queue_index against each wallet's computed index.
 * Returns null if none match (not ours, or we don't hold the key).
 */
async function resolveWallet(queueIndex: string): Promise<ResolvedWallet | null> {
  const { accounts } = useWalletStore.getState();
  for (const a of accounts) {
    if (!a.isMultisig || !a.smartAccountAddress) continue;
    const wck = await getWalletCosignKey(a.smartAccountAddress);
    if (wck && queueIndexFor(wck, a.smartAccountAddress) === queueIndex) {
      return { address: a.smartAccountAddress, wck };
    }
  }
  return null;
}

/** Decrypt a raw request into the transport-agnostic packet shape. */
function decryptToPacket(raw: CosignRequestRaw, w: ResolvedWallet): CosignPacket {
  return {
    v: 1,
    id: raw.id,
    network: raw.network === 'mainnet' ? 'mainnet' : 'testnet',
    smartAccountAddress: w.address,
    unsignedTxXdr: decryptForWallet(w.wck, raw.unsignedTxXdr, w.address),
    threshold: raw.threshold,
    // signerKey carries the blind id here (the real device key is never stored
    // server-side). aggregateAndSubmit dedupes via the decrypted entry, not this
    // field, so submit is unaffected; "have I signed" is checked via blind id in
    // approveRequest.
    signatures: raw.signatures.map((s) => ({
      signerKey: s.blindSignerId,
      authEntryXdr: decryptForWallet(w.wck, s.authEntryXdr, w.address),
    })),
    expiresLedger: 0,
    createdAt: raw.createdAt,
  };
}

function decryptedEntries(raw: CosignRequestRaw, w: ResolvedWallet): CollectedEntry[] {
  return raw.signatures.map((s) => ({
    signerKey: s.blindSignerId,
    authEntryXdr: decryptForWallet(w.wck, s.authEntryXdr, w.address),
  }));
}

export async function createTransferRequest(p: CreateTransferPacketParams): Promise<CosignPacket> {
  const account = p.multisigAccount.smartAccountAddress;
  if (!account) throw new Error('This multisig wallet is not deployed yet.');
  const me = pickSigner();
  if (!me) throw new Error('No personal account on this device to sign with.');

  const t = await token();
  // Creator generates the wallet's key on first send if absent (idempotent —
  // returns the wizard-created key when present). Members get it via the
  // latch://cosign-key link; this is the creator's bootstrap point.
  const wck = await ensureWalletCosignKey(account);
  const w: ResolvedWallet = { address: account, wck };
  const threshold = await onChainThreshold(account);

  const assembled = await buildAssembledTransfer({
    multisigAddress: account,
    sacContractId: p.sacContractId,
    destinationAddress: p.destinationAddress,
    amount: p.amount,
  });

  let raw = await createCosignRequest(t, {
    queueIndex: queueIndexFor(wck, account),
    unsignedTxXdr: encryptForWallet(wck, assembled.unsignedTxXdr, account),
    network: NETWORK,
    threshold,
  });

  // Sign our own member entry and attach it (encrypted, blind-id'd).
  const entry = await signSharedEntry(
    assembled.unsignedTxXdr,
    me.account,
    me.listIndex,
    useWalletStore.getState().mnemonic,
  );
  raw = await addCosignSignature(
    t,
    raw.id,
    blindSignerId(wck, entry.signerKey),
    encryptForWallet(wck, entry.authEntryXdr, account),
  );
  return decryptToPacket(raw, w);
}

export async function getRequest(id: string): Promise<CosignPacket | null> {
  const t = await token();
  let raw: CosignRequestRaw;
  try {
    raw = await getCosignRequest(t, id);
  } catch (e) {
    if (e instanceof CosignApiError && e.status === 404) return null;
    throw e;
  }
  const w = await resolveWallet(raw.queueIndex);
  return w ? decryptToPacket(raw, w) : null;
}

export async function approveRequest(id: string): Promise<CosignPacket> {
  const t = await token();
  const raw = await getCosignRequest(t, id);
  const w = await resolveWallet(raw.queueIndex);
  if (!w) throw new Error("This wallet's encryption key isn't on this device.");

  const me = pickSigner();
  if (!me) throw new Error('No personal account on this device to sign with.');

  const myKey = await getMySignerKey();
  const myBlind = myKey ? blindSignerId(w.wck, myKey) : null;
  if (myBlind && raw.signatures.some((s) => s.blindSignerId === myBlind)) {
    throw new Error('You have already approved this transfer.');
  }

  const unsignedTxXdr = decryptForWallet(w.wck, raw.unsignedTxXdr, w.address);
  const entry = await signSharedEntry(
    unsignedTxXdr,
    me.account,
    me.listIndex,
    useWalletStore.getState().mnemonic,
  );
  const updated = await addCosignSignature(
    t,
    id,
    blindSignerId(w.wck, entry.signerKey),
    encryptForWallet(w.wck, entry.authEntryXdr, w.address),
  );
  return decryptToPacket(updated, w);
}

/**
 * Submit once threshold is met, then mark the request submitted. The gate
 * re-reads the threshold from chain (defense in depth, same as the P2P path).
 */
export async function submitRequest(id: string): Promise<{ hash: string }> {
  const t = await token();
  const raw = await getCosignRequest(t, id);
  const w = await resolveWallet(raw.queueIndex);
  if (!w) throw new Error("This wallet's encryption key isn't on this device.");

  const threshold = await onChainThreshold(w.address);
  if (raw.signatures.length < threshold) {
    throw new Error(`Not enough approvals yet (${raw.signatures.length}/${threshold}).`);
  }

  const unsignedTxXdr = decryptForWallet(w.wck, raw.unsignedTxXdr, w.address);
  const { hash } = await aggregateAndSubmit(unsignedTxXdr, decryptedEntries(raw, w));
  await markCosignSubmitted(t, id, hash);
  return { hash };
}

// Accounts we already tried (and failed) to auto-fetch a WCK for this session,
// so the 15s pending-list poll doesn't hammer the server with 404 lookups.
const wckFetchAttempted = new Set<string>();

/** All pending requests for one shared wallet (decrypted, packet-shaped). */
export async function listForAccount(account: string): Promise<CosignPacket[]> {
  let wck = await getWalletCosignKey(account);
  if (!wck && !wckFetchAttempted.has(account)) {
    // Self-healing bootstrap: first pending-list poll without a key tries the
    // server-side sealed bundle once (zero-touch member pickup).
    wckFetchAttempted.add(account);
    try {
      if (await autoFetchWalletCosignKey(account)) {
        wck = await getWalletCosignKey(account);
      }
    } catch {
      /* no bundle / not sealed for us — manual link remains the fallback */
    }
  }
  if (!wck) return []; // no key for this wallet on this device → nothing to show
  const t = await token();
  const raws = await listCosignRequests(t, queueIndexFor(wck, account));
  const w: ResolvedWallet = { address: account, wck };
  return raws.map((r) => decryptToPacket(r, w));
}

export async function cancelRequest(id: string): Promise<void> {
  await cancelCosignRequest(await token(), id);
}
