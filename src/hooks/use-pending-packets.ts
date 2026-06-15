/**
 * use-pending-packets.ts — React Query hook over the local P2P co-sign packet
 * store (lib/cosign-packet). Replaces the backend cosign queue: in the P2P
 * model the "pending approvals" are self-contained packets this device holds
 * (created locally or imported via share/QR), not server-side requests.
 *
 * Each item is shaped to the fields the existing pending UI reads
 * (signatureCount / threshold / smartAccountAddress / network / expiresAt) so
 * the screens drop in unchanged.
 *
 * Used by:
 *   - app/pending-approval.tsx — full list + approve/submit
 *   - app/(tabs)/history.tsx (PendingCosignList) — Pending filter
 *   - components/home/PendingApprovalBanner — home badge
 *   - app/(auth)/biometric.tsx — cold-open routing (fetchPendingPacketsOnce)
 */

import { useQuery } from '@tanstack/react-query';

import { pruneExpiredPackets, type CosignPacket } from '@/src/lib/cosign-packet';
import { canApprove, isBackendEnabled, listForAccount } from '@/src/lib/cosign-transport';
import { SIGNATURE_VALIDITY_LEDGERS } from '@/src/lib/multisig-send';
import { useWalletStore } from '@/src/store/wallet';

export const PENDING_PACKETS_QUERY_KEY = ['cosign', 'pending-packets'];

export interface PendingPacketView {
  id: string;
  smartAccountAddress: string;
  network: string;
  signatureCount: number;
  threshold: number;
  /** ISO timestamp, derived from the packet's pinned ledger expiry (~8min). */
  expiresAt: string;
  /** signatureCount >= threshold — ready to broadcast. */
  ready: boolean;
  /** This device holds a signer that hasn't signed yet. */
  canApprove: boolean;
}

// The packet pins expiration at +SIGNATURE_VALIDITY_LEDGERS (~5s each). We only
// have createdAt locally, so approximate the wall-clock expiry from it — kept in
// sync with the on-chain pin so the list and reality agree.
const PACKET_TTL_MS = SIGNATURE_VALIDITY_LEDGERS * 5 * 1000;

async function toView(packet: CosignPacket): Promise<PendingPacketView> {
  const signatureCount = packet.signatures.length;
  return {
    id: packet.id,
    smartAccountAddress: packet.smartAccountAddress,
    network: packet.network,
    signatureCount,
    threshold: packet.threshold,
    expiresAt: new Date(new Date(packet.createdAt).getTime() + PACKET_TTL_MS).toISOString(),
    ready: signatureCount >= packet.threshold,
    // Transport-aware: a backend packet's signerKeys are blind ids, so the
    // "have I signed?" check must run through the transport rather than a raw
    // key compare (which never matches in backend mode → button never clears).
    canApprove: await canApprove(packet),
  };
}

async function readPendingViews(): Promise<PendingPacketView[]> {
  let packets: CosignPacket[];
  if (isBackendEnabled()) {
    // Backend transport: poll the encrypted queue for every shared wallet this
    // device tracks. (A member who hasn't added the wallet to their account
    // list won't see its queue — acceptable v1; tracked as a follow-up.)
    const { accounts } = useWalletStore.getState();
    const wallets = accounts
      .filter((a) => a.isMultisig && a.smartAccountAddress)
      .map((a) => a.smartAccountAddress as string);
    if (__DEV__) {
      console.log('[pending] backend poll for', wallets.length, 'shared wallet(s):', wallets);
    }
    const lists = await Promise.all(
      wallets.map((acc) =>
        listForAccount(acc).catch((e) => {
          // Don't let one wallet's failure blank the whole list — but surface it,
          // otherwise a 429 / missing-WCK / token error looks identical to "nothing pending".
          if (__DEV__) console.log('[pending] listForAccount FAILED', acc, '→', e?.message);
          return [];
        }),
      ),
    );
    packets = lists.flat();
    if (__DEV__) console.log('[pending] decrypted', packets.length, 'packet(s) total');
  } else {
    // P2P: pruneExpiredPackets drops dead packets from storage and returns the
    // live ones, so expired rows disappear instead of lingering.
    packets = await pruneExpiredPackets(PACKET_TTL_MS);
  }

  const views = await Promise.all(packets.map(toView));
  return views.sort((a, b) => b.expiresAt.localeCompare(a.expiresAt));
}

export interface UsePendingPacketsResult {
  requests: PendingPacketView[];
  count: number;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
}

export function usePendingPackets(): UsePendingPacketsResult {
  const query = useQuery({
    queryKey: PENDING_PACKETS_QUERY_KEY,
    refetchInterval: 30_000,
    queryFn: readPendingViews,
  });

  return {
    requests: query.data ?? [],
    count: (query.data ?? []).length,
    isLoading: query.isLoading,
    refetch: () => query.refetch(),
  };
}

/**
 * One-shot read used by the cold-open splash to decide whether to route the
 * user to /pending-approval. Bypasses React Query so it can run outside the
 * React tree. `smartAccountAddress` (optional) scopes the result to one wallet.
 */
export async function fetchPendingPacketsOnce(
  smartAccountAddress?: string,
): Promise<PendingPacketView[]> {
  try {
    const views = await readPendingViews();
    return smartAccountAddress
      ? views.filter((v) => v.smartAccountAddress === smartAccountAddress)
      : views;
  } catch {
    return [];
  }
}
