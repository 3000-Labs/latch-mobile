/**
 * use-stellar-transactions.ts — Activity feed for the active Latch account.
 *
 * Phase 3 (Step 3.11): fetches paginated history from wallet-backend GraphQL
 * instead of stitching Horizon + Soroban-RPC + bundler queries client-side.
 * Balance lookups still go directly to Soroban RPC for latency (see
 * use-portfolio.ts).
 *
 * Auth: wallet-scope JWT acquired via src/lib/wallet-auth.ts. The token is
 * minted on first call (mnemonic users sign silently; passkey users see one
 * Face ID prompt per session) and cached in SecureStore.
 */

import { Asset, Keypair } from '@stellar/stellar-sdk';
import { useQuery } from '@tanstack/react-query';
import { STELLAR_NETWORK_PASSPHRASE } from '../constants/config';
import { WELL_KNOWN_TOKENS } from '../constants/known-tokens';
import {
  fetchAccountHistory,
  GraphQLError,
  type HistoryStateChange,
} from '../api/wallet-backend';
import { ensureWalletSession, refreshWalletSession } from '../lib/wallet-auth';
import { useWalletStore, type WalletAccount } from '../store/wallet';

// Kept per the Phase 3 plan: used by the classifier to recognise self-paid
// Soroban fees when they surface on the activity feed in the future.
let BUNDLER_G_ADDRESS: string | null = null;
try {
  const s = process.env.EXPO_PUBLIC_BUNDLER_SECRET;
  if (s) BUNDLER_G_ADDRESS = Keypair.fromSecret(s).publicKey();
} catch {}

export interface StellarPayment {
  id: string;
  transactionHash: string;
  /** Wallet-backend operation type (e.g. INVOKE_HOST_FUNCTION, PAYMENT) */
  type: string;
  /** Derived semantic type — used by the UI for display */
  txType: 'send' | 'receive' | 'swap' | 'bridge' | 'unknown';
  from: string;
  to: string;
  amount: string;
  assetType: string;
  assetCode?: string;
  createdAt: string;
}

// ─── SAC contract ID → asset code lookup ─────────────────────────────────────

const SAC_CONTRACT_INFO = new Map<string, { code: string; assetType: string }>();

try {
  SAC_CONTRACT_INFO.set(Asset.native().contractId(STELLAR_NETWORK_PASSPHRASE), {
    code: 'XLM',
    assetType: 'native',
  });
} catch {}

for (const t of WELL_KNOWN_TOKENS) {
  try {
    const id =
      t.sacContractId ?? new Asset(t.code, t.issuer!).contractId(STELLAR_NETWORK_PASSPHRASE);
    SAC_CONTRACT_INFO.set(id, { code: t.code, assetType: 'credit_alphanum4' });
  } catch {}
}

function assetInfoFor(tokenId: string | undefined): { code?: string; assetType: string } {
  if (!tokenId) return { assetType: 'native' };
  const info = SAC_CONTRACT_INFO.get(tokenId);
  if (!info) return { assetType: 'credit_alphanum4' }; // unknown token; UI will show address
  return info.code === 'XLM'
    ? { assetType: 'native' }
    : { code: info.code, assetType: info.assetType };
}

// ─── Map state-change edges → StellarPayment[] ───────────────────────────────

function mapHistoryToPayments(
  edges: { node: HistoryStateChange }[],
  cAddress: string,
): StellarPayment[] {
  const out: StellarPayment[] = [];

  for (const { node: change } of edges) {
    // We only render balance-affecting changes in the activity feed.
    if (change.type !== 'BALANCE' && change.type !== 'balance') continue;

    const reason = change.reason.toUpperCase();
    const isCredit = reason === 'CREDIT' || reason === 'MINT';
    const isDebit = reason === 'DEBIT' || reason === 'BURN';
    if (!isCredit && !isDebit) continue;

    // Counterparty = the other StandardBalanceChange on the same operation
    // affecting a different account with the same token.
    const counter = change.operation?.stateChanges.edges.find(({ node: c }) => {
      const r = c.reason.toUpperCase();
      const opposite = isCredit ? r === 'DEBIT' || r === 'BURN' : r === 'CREDIT' || r === 'MINT';
      return (
        opposite &&
        c.account.address !== cAddress &&
        c.tokenId === change.tokenId &&
        c.type.toUpperCase() === 'BALANCE'
      );
    });
    const counterAddress = counter?.node.account.address ?? '';

    const info = assetInfoFor(change.tokenId);

    out.push({
      id: change.operation?.id?.toString() ?? change.transaction.hash,
      transactionHash: change.transaction.hash,
      type: change.operation?.operationType ?? 'unknown',
      txType: 'unknown', // filled in by classifyTxTypes
      from: isCredit ? counterAddress : cAddress,
      to: isCredit ? cAddress : counterAddress,
      amount: change.amount ?? '0',
      assetType: info.assetType,
      assetCode: info.code,
      createdAt: change.ledgerCreatedAt,
    });
  }

  return out;
}

// ─── Send/receive/swap classification ────────────────────────────────────────

function classifyTxTypes(payments: StellarPayment[], cAddress: string): StellarPayment[] {
  const byHash = new Map<string, StellarPayment[]>();
  for (const p of payments) {
    const key = p.transactionHash || p.id;
    const group = byHash.get(key) ?? [];
    group.push(p);
    byHash.set(key, group);
  }

  return payments.map((p) => {
    const key = p.transactionHash || p.id;
    const group = byHash.get(key) ?? [p];

    const hasOutgoing = group.some((g) => g.from === cAddress);
    const hasIncoming = group.some((g) => g.to === cAddress);
    const distinctAssets = new Set(group.map((g) => g.assetCode ?? 'XLM')).size;

    let txType: StellarPayment['txType'];
    if (hasOutgoing && hasIncoming && distinctAssets > 1) {
      txType = 'swap';
    } else if (p.from === cAddress) {
      txType = 'send';
    } else if (p.to === cAddress) {
      txType = 'receive';
    } else {
      txType = 'unknown';
    }

    return { ...p, txType };
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function fetchStellarPayments(
  account: WalletAccount,
  cAddress: string,
): Promise<StellarPayment[]> {
  let accessToken = await ensureWalletSession(account);

  let conn;
  try {
    conn = await fetchAccountHistory(cAddress, 50, undefined, accessToken);
  } catch (err) {
    if (err instanceof GraphQLError && err.code === 'UNAUTHORIZED') {
      const refreshed = await refreshWalletSession();
      accessToken = refreshed ?? (await ensureWalletSession(account));
      conn = await fetchAccountHistory(cAddress, 50, undefined, accessToken);
    } else {
      throw err;
    }
  }

  const mapped = mapHistoryToPayments(conn.edges, cAddress);
  const sorted = mapped.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return classifyTxTypes(sorted, cAddress);
}

export function useStellarTransactions(cAddress: string | null) {
  const { accounts, activeAccountIndex } = useWalletStore();
  const account = accounts[activeAccountIndex];

  return useQuery({
    queryKey: ['stellar-transactions', cAddress, account?.gAddress, account?.smartAccountAddress],
    queryFn: () => fetchStellarPayments(account!, cAddress!),
    enabled: !!cAddress && !!account,
    staleTime: 30_000,
    retry: 1,
  });
}

// Re-export the bundler address for any future caller — currently unused by
// the new flow but kept per the Phase 3 plan in case classification needs it.
export { BUNDLER_G_ADDRESS };
