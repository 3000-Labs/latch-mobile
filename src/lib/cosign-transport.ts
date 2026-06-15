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
  createTransferPacket,
  getMySignerKey as p2pGetMySignerKey,
  getPacket,
  onChainThreshold,
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

export function getEntry(id: string): Promise<CosignPacket | null> {
  return isBackendEnabled() ? backend.getRequest(id) : getPacket(id);
}

export function approve(id: string): Promise<CosignPacket> {
  return isBackendEnabled() ? backend.approveRequest(id) : approvePacket(id);
}

export function submit(id: string): Promise<{ hash: string }> {
  return isBackendEnabled() ? backend.submitRequest(id) : submitPacket(id);
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
export function cancel(id: string): Promise<void> {
  return isBackendEnabled() ? backend.cancelRequest(id) : removePacket(id);
}

/** Pending approvals for one shared wallet, in the active transport. */
export function listForAccount(account: string): Promise<CosignPacket[]> {
  return isBackendEnabled() ? backend.listForAccount(account) : Promise.resolve([]);
}

/** Whether this device can still add an approval, in the active transport. */
export function canApprove(packet: CosignPacket): Promise<boolean> {
  return isBackendEnabled() ? backend.canApprove(packet) : p2pCanApprove(packet);
}

/** Subset of the given signer keys (keyDataHex) that has approved, per transport. */
export function approvedKeyData(
  packet: CosignPacket,
  keyDataHexList: string[],
): Promise<Set<string>> {
  return isBackendEnabled()
    ? backend.approvedKeyData(packet, keyDataHexList)
    : Promise.resolve(p2pApprovedKeyData(packet, keyDataHexList));
}

// Shape-based, transport-agnostic — reused as-is.
export const getMySignerKey = p2pGetMySignerKey;
