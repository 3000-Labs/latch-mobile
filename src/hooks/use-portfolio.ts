import { Address, Asset, scValToNative, xdr } from '@stellar/stellar-sdk';
import { useQuery } from '@tanstack/react-query';
import { HORIZON_URL, STELLAR_NETWORK_PASSPHRASE, STELLAR_RPC_URL } from '../constants/config';
import type { TokenConfig } from '../constants/known-tokens';

export interface TokenBalance {
  code: string;
  issuer?: string; // undefined for native XLM
  sacContractId: string;
  amount: string; // human-readable, 7 decimal places
  usdValue: number;
}

/**
 * Hardcoded USD prices — replace with a live price feed when available.
 * Stablecoins are pegged 1:1. XLM uses a fixed rate for now.
 */
const TOKEN_USD_PRICES: Record<string, number> = {
  XLM: 0.16,
  USDC: 1.0,
  USDT: 1.0,
};

/**
 * Read any SAC token balance for a C-address from Soroban ledger entries.
 *
 * The balance is stored in the SAC's contract storage under:
 *   ContractData { contract: sacId, key: Vec([Symbol("Balance"), Address(cAddress)]) }
 *
 * Works for native XLM SAC and any custom asset SAC.
 * Uses XHR to avoid the Axios Android TLS failure on Soroban JSON-RPC.
 */
function fetchSacBalance(cAddress: string, sacContractId: string): Promise<string> {
  const balanceKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(sacContractId).toScAddress(),
      key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Balance'), new Address(cAddress).toScVal()]),
      durability: xdr.ContractDataDurability.persistent(),
    }),
  );

  const bytes = new Uint8Array(balanceKey.toXDR());
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const keyB64 = btoa(binary);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', STELLAR_RPC_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 15000;
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        const entries: any[] = json.result?.entries ?? [];
        if (entries.length === 0) { resolve('0'); return; }
        const entryData = xdr.LedgerEntryData.fromXDR(entries[0].xdr, 'base64');
        const val = entryData.contractData().val();
        const parsed = scValToNative(val) as { amount: bigint };
        resolve((Number(parsed.amount) / 10_000_000).toFixed(7));
      } catch {
        resolve('0');
      }
    };
    xhr.onerror = () => resolve('0');
    xhr.ontimeout = () => resolve('0');
    xhr.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getLedgerEntries',
      params: { keys: [keyB64] },
    }));
  });
}

/**
 * Fetch all token balances for a smart account (C-address).
 *
 * Token discovery strategy (union of all three, deduplicated by code+issuer):
 *  1. XLM — always included (native SAC).
 *  2. Tracked tokens — the user's persisted list (passed in; managed via useTrackedTokens).
 *  3. G-address trustlines — any additional assets held by the classic G-address.
 *
 * All SAC balance fetches run in parallel. Tokens with zero balance are hidden
 * (except XLM which is always shown).
 */
async function fetchPortfolio(
  cAddress: string,
  gAddress: string | null | undefined,
  trackedTokens: TokenConfig[],
): Promise<TokenBalance[]> {
  const nativeSacId = Asset.native().contractId(STELLAR_NETWORK_PASSPHRASE);

  // Build deduplicated list of non-native tokens to check (tracked + G-address trustlines)
  // Key is sacContractId when available (C-address tokens), otherwise code:issuer.
  const tokenMap = new Map<string, TokenConfig>();

  // 1. Tracked tokens (user-managed list)
  for (const t of trackedTokens) {
    const key = t.sacContractId ?? `${t.code}:${t.issuer}`;
    tokenMap.set(key, t);
  }

  // 2. G-address trustlines
  if (gAddress) {
    try {
      const account = await new Promise<any>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${HORIZON_URL}/accounts/${gAddress}`, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 10000;
        xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); } };
        xhr.onerror = () => resolve({});
        xhr.ontimeout = () => resolve({});
        xhr.send();
      });

      for (const b of (account.balances ?? [])) {
        if (b.asset_type === 'native' || b.asset_type === 'liquidity_pool_shares') continue;
        const key = `${b.asset_code}:${b.asset_issuer}`;
        if (!tokenMap.has(key)) {
          tokenMap.set(key, { code: b.asset_code, issuer: b.asset_issuer, name: b.asset_code });
        }
      }
    } catch {
      // G-address lookup failed — use tracked tokens only
    }
  }

  const nonNativeTokens = Array.from(tokenMap.values());

  // Fetch all balances in parallel
  const [xlmAmount, ...tokenAmounts] = await Promise.all([
    fetchSacBalance(cAddress, nativeSacId),
    ...nonNativeTokens.map((t) => {
      // Use sacContractId directly if the token was added by C-address;
      // otherwise derive the SAC ID from the classic asset code + issuer.
      const sacId = t.sacContractId
        ? t.sacContractId
        : new Asset(t.code, t.issuer!).contractId(STELLAR_NETWORK_PASSPHRASE);
      return fetchSacBalance(cAddress, sacId).then((amount) => ({ t, sacId, amount }));
    }),
  ]);

  const results: TokenBalance[] = [
    {
      code: 'XLM',
      issuer: undefined,
      sacContractId: nativeSacId,
      amount: xlmAmount as string,
      usdValue: parseFloat(xlmAmount as string) * TOKEN_USD_PRICES.XLM,
    },
  ];

  for (const { t, sacId, amount } of tokenAmounts as Array<{ t: TokenConfig; sacId: string; amount: string }>) {
    if (parseFloat(amount) <= 0) continue; // hide zero-balance tokens
    results.push({
      code: t.code,
      issuer: t.issuer,
      sacContractId: sacId,
      amount,
      usdValue: parseFloat(amount) * (TOKEN_USD_PRICES[t.code] ?? 0),
    });
  }

  return results;
}

export function usePortfolio(
  cAddress: string | null,
  gAddress?: string | null,
  trackedTokens: TokenConfig[] = [],
) {
  const tokenKey = trackedTokens.map((t) => t.sacContractId ?? `${t.code}:${t.issuer}`).join(',');
  return useQuery({
    queryKey: ['portfolio', cAddress, gAddress, tokenKey],
    queryFn: () => fetchPortfolio(cAddress!, gAddress, trackedTokens),
    enabled: !!cAddress,
    staleTime: 30_000,
  });
}
