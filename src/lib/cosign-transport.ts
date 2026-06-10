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
  canApprove as p2pCanApprove,
  createTransferPacket,
  getMySignerKey as p2pGetMySignerKey,
  getPacket,
  type CreateTransferPacketParams,
} from '@/src/lib/cosign-packet-flow';
import { approvePacket, submitPacket } from '@/src/lib/cosign-packet-flow';
import type { CosignPacket } from '@/src/lib/cosign-packet';

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

/** Pending approvals for one shared wallet, in the active transport. */
export function listForAccount(account: string): Promise<CosignPacket[]> {
  return isBackendEnabled() ? backend.listForAccount(account) : Promise.resolve([]);
}

// Shape-based, transport-agnostic — reused as-is.
export const canApprove = p2pCanApprove;
export const getMySignerKey = p2pGetMySignerKey;
