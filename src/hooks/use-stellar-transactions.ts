import { useQuery } from '@tanstack/react-query';
import { Horizon } from '@stellar/stellar-sdk';

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

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

export async function fetchStellarPayments(address: string): Promise<StellarPayment[]> {
  const server = new Horizon.Server(HORIZON_URL);
  const response = await server.payments().forAccount(address).limit(20).order('desc').call();

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
