import { useQuery } from '@tanstack/react-query';
import { Horizon } from '@stellar/stellar-sdk';
import { HORIZON_URL } from '../constants/config';

export interface StellarPayment {
  id: string;
  transactionHash: string;
  type: string;
  from: string;
  to: string;
  amount: string;
  assetType: string;
  assetCode?: string;
  createdAt: string;
}

/**
 * Horizon returns HTTP 504 on transaction submission timeouts.
 * Per Stellar docs the correct behaviour is to keep retrying the same call.
 * https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/timeout
 */
async function withHorizon504Retry<T>(fn: () => Promise<T>): Promise<T> {
  while (true) {
    try {
      return await fn();
    } catch (e: unknown) {
      const status =
        e != null &&
        typeof e === 'object' &&
        'response' in e &&
        (e as { response?: { status?: number } }).response?.status;
      if (status === 504) continue;
      throw e;
    }
  }
}

export async function fetchStellarPayments(address: string): Promise<StellarPayment[]> {
  const server = new Horizon.Server(HORIZON_URL);
  const response = await withHorizon504Retry(() =>
    server.payments().forAccount(address).limit(20).order('desc').call(),
  );

  return response.records.map((record: any) => {
    const isCreate = record.type === 'create_account';
    return {
      id: record.id,
      transactionHash: record.transaction_hash,
      type: record.type,
      from: isCreate ? record.funder : record.from,
      to: isCreate ? record.account : record.to,
      amount: isCreate ? record.starting_balance : (record.amount ?? '0'),
      assetType: isCreate ? 'native' : (record.asset_type ?? 'native'),
      assetCode: record.asset_code,
      createdAt: record.created_at,
    };
  });
}

export function useStellarTransactions(address: string | null) {
  return useQuery({
    queryKey: ['stellar-transactions', address],
    queryFn: () => fetchStellarPayments(address!),
    enabled: !!address,
    staleTime: 30_000,
    retry: 1,
  });
}
