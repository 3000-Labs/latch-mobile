import { Address, Asset, scValToNative, xdr } from '@stellar/stellar-sdk';
import { useQuery } from '@tanstack/react-query';
import { HORIZON_URL, STELLAR_NETWORK_PASSPHRASE, STELLAR_RPC_URL } from '../constants/config';
import { WELL_KNOWN_TOKENS } from '../constants/known-tokens';
import { useWalletStore } from '../store/wallet';

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

// ─── Shared XHR helpers ──────────────────────────────────────────────────────

/** XHR GET — used for Horizon REST calls. Returns parsed JSON or null on failure. */
function horizonGet(url: string): Promise<any> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 12000;
    xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText)); } catch { resolve(null); } };
    xhr.onerror = () => resolve(null);
    xhr.ontimeout = () => resolve(null);
    xhr.send();
  });
}

/** XHR POST — used for Soroban JSON-RPC calls (avoids Android Axios TLS issue). */
function sorobanRpc(method: string, params: object): Promise<any> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', STELLAR_RPC_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 15000;
    xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); } };
    xhr.onerror = () => resolve({});
    xhr.ontimeout = () => resolve({});
    xhr.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
  });
}

function scValB64(val: xdr.ScVal): string {
  const bytes = new Uint8Array(val.toXDR());
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// ─── Primary: G-address Horizon operations → per-op effects ──────────────────
//
// Horizon does NOT index `contract_credited` / `contract_debited` effects by
// C-address. The `/accounts/{C-addr}/effects` endpoint returns 400, and
// `/effects?account={C-addr}` only returns classic account effects (not Soroban
// contract effects). Confirmed via live curl against horizon-testnet.stellar.org.
//
// The only reliable Horizon approach: query the G-address's `invoke_host_function`
// operations (Horizon archives forever), then fetch effects per-operation to find
// `contract_credited` / `contract_debited` entries that match the C-address.

async function fetchGAddressHistory(gAddress: string, cAddress: string): Promise<StellarPayment[]> {
  const resp = await horizonGet(
    `${HORIZON_URL}/accounts/${encodeURIComponent(gAddress)}/operations?limit=50&order=desc`,
  );

  const allOps = (resp?._embedded?.records ?? []) as any[];
  const invokeOps = allOps.filter((r) => r.type === 'invoke_host_function');

  if (__DEV__) {
    console.log('[G-addr history] total ops:', allOps.length, '| invoke_host_function:', invokeOps.length);
  }

  if (invokeOps.length === 0) return [];

  // Fetch effects for each invoke op in parallel
  const effectsBatch = await Promise.all(
    invokeOps.map((op: any) =>
      horizonGet(`${HORIZON_URL}/operations/${op.id}/effects`)
        .then((r) => r?._embedded?.records ?? []),
    ),
  );

  if (__DEV__) {
    const sampleEffects = effectsBatch.find((e) => e.length > 0);
    if (sampleEffects) {
      console.log('[G-addr history] sample effects:', JSON.stringify(sampleEffects.slice(0, 2).map((e: any) => ({
        type: e.type, account: e.account, amount: e.amount, asset: e.asset_code ?? e.asset_type,
      }))));
    }
  }

  const results: StellarPayment[] = [];
  for (let i = 0; i < invokeOps.length; i++) {
    const op = invokeOps[i] as any;
    const effects: any[] = effectsBatch[i];

    // Find the effect that credits or debits the C-address specifically.
    // Horizon stores the contract address in `e.contract`, not `e.account`, for SAC effects.
    const matchesCAddress = (e: any) => e.account === cAddress || e.contract === cAddress;
    const creditEffect = effects.find((e) => e.type === 'contract_credited' && matchesCAddress(e));
    const debitEffect = effects.find((e) => e.type === 'contract_debited' && matchesCAddress(e));

    if (!creditEffect && !debitEffect) continue;

    const isIncoming = !!creditEffect;
    const effect = (creditEffect ?? debitEffect) as any;

    results.push({
      id: op.id,
      transactionHash: op.transaction_hash ?? '',
      type: 'invoke_host_function',
      from: isIncoming ? op.source_account : cAddress,
      to: isIncoming ? cAddress : op.source_account,
      amount: effect.amount ?? '0',
      assetType: effect.asset_type === 'native' ? 'native' : 'credit_alphanum4',
      assetCode: effect.asset_code,
      createdAt: op.created_at ?? '',
    });
  }

  if (__DEV__) {
    console.log('[G-addr history] matched transactions:', results.length);
  }

  return results;
}

// ─── Secondary: Soroban RPC SAC transfer events (last ~7 days) ───────────────
//
// Supplements the G-address Horizon history with recent events that provide
// exact from/to contract addresses. Also the only source for passkey wallets
// (no G-address) and for smart account sends via the bundler (the bundler is
// the outer tx source, so those ops don't appear in the user's G-address history).
//
// Queries ALL well-known SAC contracts (native XLM + WELL_KNOWN_TOKENS) in
// parallel so USDC, EURC, and other token transfers appear alongside XLM.
//
// Limited to the RPC retention window (~7 days / ~17,000 ledgers).

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// Pre-compute once per network — SAC contract IDs are deterministic from code+issuer+passphrase.
const SAC_CONTRACT_INFO: Map<string, { code: string; assetType: string }> = (() => {
  const m = new Map<string, { code: string; assetType: string }>();
  m.set(Asset.native().contractId(STELLAR_NETWORK_PASSPHRASE), { code: 'XLM', assetType: 'native' });
  for (const t of WELL_KNOWN_TOKENS) {
    try {
      const id = t.sacContractId ?? new Asset(t.code, t.issuer!).contractId(STELLAR_NETWORK_PASSPHRASE);
      m.set(id, { code: t.code, assetType: 'credit_alphanum4' });
    } catch {}
  }
  return m;
})();

const ALL_SAC_IDS = [...SAC_CONTRACT_INFO.keys()];

async function fetchSacTransferEvents(cAddress: string): Promise<StellarPayment[]> {
  const latestLedgerResp = await sorobanRpc('getLatestLedger', {});
  const latestLedger: number = latestLedgerResp?.result?.sequence ?? 0;

  if (latestLedger === 0) {
    if (__DEV__) console.warn('[SAC events] getLatestLedger failed — skipping SAC events fetch');
    return [];
  }

  // 17,000-ledger window (~23h at 5s/ledger) — within any provider's retention limit.
  const startLedger = latestLedger - 17_000;

  if (__DEV__) {
    console.log('[SAC events] latestLedger:', latestLedger, '→ startLedger:', startLedger,
      '| querying', ALL_SAC_IDS.length, 'SAC contracts');
  }

  const transferSym = scValB64(xdr.ScVal.scvSymbol('transfer'));
  const cAddressVal = scValB64(new Address(cAddress).toScVal());
  const wildcard = '*';

  // Build params for one request: up to 5 filters × 5 contractIds = 25 SAC IDs per call.
  const buildParams = (sacBatch: string[], sender: string, recipient: string, start: number) => ({
    startLedger: start,
    filters: chunkArray(sacBatch, 5).map((group) => ({
      type: 'contract',
      contractIds: group,
      topics: [[transferSym], [sender], [recipient], [wildcard]],
    })),
    pagination: { limit: 200 },
  });

  const sacBatches = chunkArray(ALL_SAC_IDS, 25);

  const runQueries = (start: number) =>
    Promise.all(
      sacBatches.flatMap((batch) => [
        sorobanRpc('getEvents', buildParams(batch, wildcard, cAddressVal, start)),
        sorobanRpc('getEvents', buildParams(batch, cAddressVal, wildcard, start)),
      ]),
    );

  let responses = await runQueries(startLedger);

  // Retry with a tighter 4,320-ledger window (~6h) if any call hit a retention error.
  if (responses.some((r) => r?.error)) {
    if (__DEV__)
      console.warn('[SAC events] getEvents error — retrying with 4,320-ledger window');
    responses = await runQueries(latestLedger - 4_320);
  }

  if (__DEV__) {
    const total = responses.reduce((s, r) => s + (r?.result?.events?.length ?? 0), 0);
    console.log('[SAC events] total raw events:', total);
  }

  const mapEvent = (event: any): StellarPayment | null => {
    try {
      const topics: string[] = event.topic ?? [];
      const from = String(scValToNative(xdr.ScVal.fromXDR(topics[1], 'base64')));
      const to = String(scValToNative(xdr.ScVal.fromXDR(topics[2], 'base64')));
      const amountRaw = scValToNative(xdr.ScVal.fromXDR(event.value, 'base64')) as bigint;
      const assetInfo = SAC_CONTRACT_INFO.get(event.contractId) ?? { code: 'XLM', assetType: 'native' };
      return {
        id: event.id ?? event.txHash,
        transactionHash: event.txHash ?? '',
        type: 'invoke_host_function',
        from,
        to,
        amount: (Number(amountRaw) / 10_000_000).toFixed(7),
        assetType: assetInfo.assetType,
        assetCode: assetInfo.code === 'XLM' ? undefined : assetInfo.code,
        createdAt: event.ledgerClosedAt ?? '',
      };
    } catch {
      return null;
    }
  };

  const seen = new Set<string>();
  return responses
    .flatMap((r) => r?.result?.events ?? [])
    .map(mapEvent)
    .filter((tx): tx is StellarPayment => {
      if (!tx) return false;
      if (seen.has(tx.transactionHash)) return false;
      seen.add(tx.transactionHash);
      return true;
    });
}

// ─── Merge ───────────────────────────────────────────────────────────────────

export async function fetchStellarPayments(
  cAddress: string,
  gAddress?: string | null,
): Promise<StellarPayment[]> {
  // Run both sources in parallel
  const [gAddrResult, sacResult] = await Promise.allSettled([
    gAddress ? fetchGAddressHistory(gAddress, cAddress) : Promise.resolve([]),
    fetchSacTransferEvents(cAddress),
  ]);

  if (__DEV__) {
    if (gAddrResult.status === 'rejected')
      console.log('[G-addr history] ERROR:', (gAddrResult.reason as any)?.message ?? gAddrResult.reason);
    if (sacResult.status === 'rejected')
      console.log('[SAC events] ERROR:', (sacResult.reason as any)?.message ?? sacResult.reason);
    if (!gAddress)
      console.log('[tx history] No G-address — using RPC events only (7-day window)');
  }

  const horizonTxs = gAddrResult.status === 'fulfilled' ? gAddrResult.value : [];
  const sacEvents = sacResult.status === 'fulfilled' ? sacResult.value : [];

  // SAC events take dedup priority (exact from/to); Horizon fills historical gaps
  const seen = new Set<string>();
  const merged = [...sacEvents, ...horizonTxs].filter((tx) => {
    if (!tx.transactionHash || seen.has(tx.transactionHash)) return false;
    seen.add(tx.transactionHash);
    return true;
  });

  return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * G-address is read from the wallet store so callers only need to pass cAddress.
 * Both sources run in parallel:
 *  1. G-address Horizon ops → per-op effects (full history, requires G-address)
 *  2. Soroban RPC SAC transfer events (recent ~7 days, works for any C-address)
 */
export function useStellarTransactions(cAddress: string | null) {
  const { accounts, activeAccountIndex } = useWalletStore();
  const gAddress = accounts[activeAccountIndex]?.gAddress || null;

  return useQuery({
    queryKey: ['stellar-transactions', cAddress, gAddress],
    queryFn: () => fetchStellarPayments(cAddress!, gAddress),
    enabled: !!cAddress,
    staleTime: 30_000,
    retry: 1,
  });
}
