import { useQuery } from '@tanstack/react-query';
import { fetchDepositInfo, fetchDepositStatus } from '../api/latch-auth';

export function useDepositInfo() {
  return useQuery({
    queryKey: ['deposit-info'],
    queryFn: fetchDepositInfo,
    staleTime: Infinity, // pool address + memo are permanent per user
  });
}

export function useDepositStatus(enabled: boolean) {
  return useQuery({
    queryKey: ['deposit-status'],
    queryFn: fetchDepositStatus,
    enabled,
    refetchInterval: enabled ? 15_000 : false,
  });
}
