/**
 * cosign-transport.ts — selects the multisig approval transport
 * (docs/multisig-encrypted-queue.md, Phase 2 step 4).
 *
 *   EXPO_PUBLIC_MULTISIG_BACKEND_ENABLED !== 'true'  → P2P packets (default)
 *   EXPO_PUBLIC_MULTISIG_BACKEND_ENABLED === 'true'  → encrypted backend queue
 *
 * Both transports speak the same CosignPacket shape, so the UI calls these
 * dispatchers and never branches on transport. With the flag off the backend
 * module is never touched and behaviour is byte-identical to the P2P path.
 */

import * as backend from '@/src/lib/cosign-backend-flow';
import {
  approvedKeyData as p2pApprovedKeyData,
  canApprove as p2pCanApprove,
  createSwapPacket,
  createTransferPacket,
  getMySignerKey as p2pGetMySignerKey,
  getPacket,
  onChainThreshold,
  type CreateSwapPacketParams,
  type CreateTransferPacketParams,
} from '@/src/lib/cosign-packet-flow';
import { approvePacket, submitPacket } from '@/src/lib/cosign-packet-flow';
import { removePacket, type CosignPacket } from '@/src/lib/cosign-packet';
import { friendlyTxError } from '@/src/lib/tx-errors';

export function isBackendEnabled(): boolean {
  return process.env.EXPO_PUBLIC_MULTISIG_BACKEND_ENABLED === 'true';
}

export function createTransfer(p: CreateTransferPacketParams): Promise<CosignPacket> {
  return isBackendEnabled() ? backend.createTransferRequest(p) : createTransferPacket(p);
}

export { type CreateSwapPacketParams };

export function createSwap(p: CreateSwapPacketParams): Promise<CosignPacket> {
  // The backend queue can't carry swap display metadata (kind/swapMeta) — it
  // only stores an encrypted XDR + threshold. So swaps always use the local P2P
  // packet path, even when the backend transport is enabled for transfers. The
  // dispatchers below are local-first so the rest of the flow still finds them.
  return createSwapPacket(p);
}

/**
 * A P2P packet (currently: any swap) is held in local AsyncStorage. When the
 * backend transport is on, the per-id dispatchers must check local storage FIRST
 * so a locally-saved swap isn't looked up in the backend (where it doesn't
 * exist) — that mismatch is what dropped swap initiators onto the empty
 * scan/paste screen. Backend transfers have no local copy, so they fall through.
 */
async function isLocalPacket(id: string): Promise<boolean> {
  return (await getPacket(id)) !== null;
}

export async function getEntry(id: string): Promise<CosignPacket | null> {
  if (!isBackendEnabled()) return getPacket(id);
  const local = await getPacket(id);
  return local ?? backend.getRequest(id);
}

export async function approve(id: string): Promise<CosignPacket> {
  if (isBackendEnabled() && !(await isLocalPacket(id))) return backend.approveRequest(id);
  return approvePacket(id);
}

export async function submit(id: string): Promise<{ hash: string }> {
  if (isBackendEnabled() && !(await isLocalPacket(id))) return backend.submitRequest(id);
  return submitPacket(id);
}

export interface ApproveOutcome {
  packet: CosignPacket;
  /** Set when this approval met the threshold and the tx was broadcast. */
  submitted: { hash: string } | null;
  /** Set when the approval landed but the auto-submit attempt failed. */
  submitError: string | null;
}

/**
 * Approve, then auto-submit if this approval met the threshold — so the last
 * signer never has to tap "Submit" manually. The threshold here is read LIVE
 * from chain (never packet.threshold); it only decides whether to attempt
 * submit — submit() re-reads it again internally as the authoritative gate.
 *
 * An approve failure throws; a submit failure does NOT (the signature already
 * landed) — it's surfaced in submitError and the manual Submit button remains
 * the fallback.
 */
export async function approveAndMaybeSubmit(id: string): Promise<ApproveOutcome> {
  const packet = await approve(id);
  const threshold = await onChainThreshold(packet.smartAccountAddress);
  if (packet.signatures.length < threshold) {
    return { packet, submitted: null, submitError: null };
  }
  try {
    return { packet, submitted: await submit(id), submitError: null };
  } catch (e) {
    return { packet, submitted: null, submitError: friendlyTxError(e) };
  }
}

/**
 * Withdraw a pending transfer. P2P: drops the local packet only. Backend: a
 * GLOBAL cancel — any member holding the capability can veto a pending request
 * for everyone (capability = membership; flagged in docs).
 */
export async function cancel(id: string): Promise<void> {
  if (isBackendEnabled() && !(await isLocalPacket(id))) return backend.cancelRequest(id);
  await removePacket(id);
}

/** Pending approvals for one shared wallet, in the active transport. */
export function listForAccount(account: string): Promise<CosignPacket[]> {
  return isBackendEnabled() ? backend.listForAccount(account) : Promise.resolve([]);
}

/**
 * Clear any per-session "already tried, gave up" fetch guards so a manual
 * pull-to-refresh gets a genuine retry instead of replaying a stale failure.
 * No-op for P2P (nothing to reset there).
 */
export function resetPendingFetchState(): void {
  if (isBackendEnabled()) backend.resetWckFetchAttempts();
}

/** Whether this device can still add an approval, in the active transport. */
export async function canApprove(packet: CosignPacket): Promise<boolean> {
  if (isBackendEnabled() && !(await isLocalPacket(packet.id))) return backend.canApprove(packet);
  return p2pCanApprove(packet);
}

/** Subset of the given signer keys (keyDataHex) that has approved, per transport. */
export async function approvedKeyData(
  packet: CosignPacket,
  keyDataHexList: string[],
): Promise<Set<string>> {
  if (isBackendEnabled() && !(await isLocalPacket(packet.id))) {
    return backend.approvedKeyData(packet, keyDataHexList);
  }
  return p2pApprovedKeyData(packet, keyDataHexList);
}

// Shape-based, transport-agnostic — reused as-is.
export const getMySignerKey = p2pGetMySignerKey;
