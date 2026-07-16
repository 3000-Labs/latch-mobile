import { useMutation, useQuery } from '@tanstack/react-query';
import { createDepositIntent, fetchDepositIntentStatus } from '../api/latch-auth';

/**
 * Mints a fresh funding intent (memo_id + pool_address) for the given smart
 * account. Call this when the user opens the Fund flow, not on Home mount —
 * intents are TTL-bound funding sessions, not permanent registrations.
 */
export function useCreateDepositIntent() {
  return useMutation({
    mutationFn: (smartAccountAddress: string) => createDepositIntent(smartAccountAddress),
  });
}

/**
 * Polls a funding intent's status every 15s while enabled, mirroring
 * useFonbnkOrderStatus's polling convention.
 */
export function useDepositIntentStatus(memoId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['deposit-intent-status', memoId],
    queryFn: () => fetchDepositIntentStatus(memoId as string),
    enabled: enabled && !!memoId,
    refetchInterval: 15_000,
    retry: 3,
    staleTime: 0,
  });
}
