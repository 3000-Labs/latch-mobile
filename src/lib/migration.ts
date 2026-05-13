import { Asset } from '@stellar/stellar-sdk';
import { HORIZON_URL, STELLAR_NETWORK_PASSPHRASE } from '../constants/config';
import { WalletAccount } from '../store/wallet';

export interface MigrableAsset {
  type: 'native' | 'token';
  code: string;
  issuer?: string;
  /** Human-readable amount, e.g. '124.7499975' */
  amount: string;
  /** SAC contract ID: Asset.contractId(networkPassphrase) */
  sacContractId: string;
}

export type MigrationState = 'not_needed' | 'not_started' | 'complete';

export interface MigrationDiscovery {
  state: MigrationState;
  gAddress: string;
  cAddress: string;
  assets: MigrableAsset[];
}

/**
 * Discover migration state for a wallet account.
 *
 * Queries the G-address balance via Horizon and derives whether the user has
 * assets to move to their smart account (C-address).
 *
 * State machine:
 *   not_needed  — passkey user (no gAddress), or G-address never funded / 404
 *   not_started — G-address has assets above the 1 XLM base reserve
 *   complete    — G-address has ≤ 1 XLM remaining (or no migratable tokens left)
 */
export async function discoverMigration(account: WalletAccount): Promise<MigrationDiscovery> {
  const not_needed: MigrationDiscovery = {
    state: 'not_needed',
    gAddress: account.gAddress,
    cAddress: account.smartAccountAddress ?? '',
    assets: [],
  };

  if (!account.gAddress || !account.smartAccountAddress) return not_needed;

  let data: any;
  try {
    const resp = await fetch(`${HORIZON_URL}/accounts/${account.gAddress}`);
    if (!resp.ok) return not_needed; // 404 = G-address never funded
    data = await resp.json();
  } catch {
    return not_needed;
  }

  const balances: any[] = data.balances ?? [];
  const assets: MigrableAsset[] = [];

  const nativeBal = balances.find((b: any) => b.asset_type === 'native');
  const xlmTotal = nativeBal ? parseFloat(nativeBal.balance) : 0;
  // Mirror the exact formula used in buildAndSubmitSacTransfer so displayed amount === transferred amount
  const minBalanceXLM = (2 + (data.subentry_count ?? 0)) * 0.5;
  const feeNeeded = 0.05; // 0.05 XLM per tx (declared 200k stroops + resource fee buffer)
  const xlmAvailableForFees = xlmTotal - minBalanceXLM;

  for (const b of balances) {
    if (b.asset_type === 'native') {
      const transferable = xlmTotal - minBalanceXLM - feeNeeded;
      if (transferable > 0.0001) {
        assets.push({
          type: 'native',
          code: 'XLM',
          amount: transferable.toFixed(7),
          sacContractId: Asset.native().contractId(STELLAR_NETWORK_PASSPHRASE),
        });
      }
    } else if (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') {
      const amount = parseFloat(b.balance);
      if (amount > 0 && xlmAvailableForFees >= feeNeeded) {
        assets.push({
          type: 'token',
          code: b.asset_code,
          issuer: b.asset_issuer,
          amount: b.balance,
          sacContractId: new Asset(b.asset_code, b.asset_issuer).contractId(
            STELLAR_NETWORK_PASSPHRASE,
          ),
        });
      }
    }
  }

  if (assets.length === 0) {
    return { state: 'complete', gAddress: account.gAddress, cAddress: account.smartAccountAddress, assets: [] };
  }

  return {
    state: 'not_started',
    gAddress: account.gAddress,
    cAddress: account.smartAccountAddress,
    assets,
  };
}
