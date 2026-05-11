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
  // Use operations() instead of payments() so that Soroban invoke_host_function
  // operations are included — payments() only returns classic payment op types.
  const response = await withHorizon504Retry(() =>
    server.operations().forAccount(address).limit(20).order('desc').call(),
  );

  return response.records.map((record: any) => {
    if (record.type === 'create_account') {
      return {
        id: record.id,
        transactionHash: record.transaction_hash,
        type: record.type,
        from: record.funder,
        to: record.account,
        amount: record.starting_balance,
        assetType: 'native',
        assetCode: undefined,
        createdAt: record.created_at,
      };
    }

    if (record.type === 'payment' || record.type === 'path_payment_strict_receive' || record.type === 'path_payment_strict_send') {
      return {
        id: record.id,
        transactionHash: record.transaction_hash,
        type: record.type,
        from: record.from,
        to: record.to,
        amount: record.amount ?? '0',
        assetType: record.asset_type ?? 'native',
        assetCode: record.asset_code,
        createdAt: record.created_at,
      };
    }

    // invoke_host_function (Soroban) and other op types — surface with source account
    return {
      id: record.id,
      transactionHash: record.transaction_hash,
      type: record.type,
      from: record.source_account ?? address,
      to: address,
      amount: '0',
      assetType: 'native',
      assetCode: undefined,
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
