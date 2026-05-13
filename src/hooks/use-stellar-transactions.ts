import { Address, Asset, scValToNative, xdr } from '@stellar/stellar-sdk';
import { useQuery } from '@tanstack/react-query';
import { HORIZON_URL, STELLAR_NETWORK_PASSPHRASE, STELLAR_RPC_URL } from '../constants/config';
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
// (no G-address) — limited to the RPC retention window (~7 days / ~100k ledgers).

async function fetchSacTransferEvents(cAddress: string): Promise<StellarPayment[]> {
  const nativeSacId = Asset.native().contractId(STELLAR_NETWORK_PASSPHRASE);

  const latestLedgerResp = await sorobanRpc('getLatestLedger', {});
  const latestLedger: number = latestLedgerResp?.result?.sequence ?? 0;

  if (latestLedger === 0) {
    if (__DEV__) console.warn('[SAC events] getLatestLedger failed — skipping SAC events fetch');
    return [];
  }

  // Use a 17,000-ledger window (~23h at 5s/ledger) — safely within any provider's
  // retention limit. Soroban RPC returns a hard error if startLedger predates the
  // oldest retained ledger, which previously caused silent empty results when using
  // the prior 100,000-ledger window on mainnet providers with shorter retention.
  const startLedger = latestLedger - 17_000;

  if (__DEV__) {
    console.log('[SAC events] latestLedger:', latestLedger, '→ startLedger:', startLedger);
  }

  const transferSym = scValB64(xdr.ScVal.scvSymbol('transfer'));
  const cAddressVal = scValB64(new Address(cAddress).toScVal());
  const wildcard = '*';

  const makeFilter = (sender: string, recipient: string) => ({
    startLedger,
    filters: [{
      type: 'contract',
      contractIds: [nativeSacId],
      topics: [[transferSym], [sender], [recipient], [wildcard]],
    }],
    pagination: { limit: 50 },
  });

  let [incomingResp, outgoingResp] = await Promise.all([
    sorobanRpc('getEvents', makeFilter(wildcard, cAddressVal)),
    sorobanRpc('getEvents', makeFilter(cAddressVal, wildcard)),
  ]);

  // If startLedger is still outside the node's retention window, retry with a
  // tighter 4,320-ledger window (~6h) before giving up.
  if (incomingResp?.error || outgoingResp?.error) {
    if (__DEV__)
      console.warn('[SAC events] getEvents error — retrying with 4,320-ledger window:',
        incomingResp?.error ?? outgoingResp?.error);
    const fallbackFilter = (s: string, r: string) => ({ ...makeFilter(s, r), startLedger: latestLedger - 4_320 });
    [incomingResp, outgoingResp] = await Promise.all([
      sorobanRpc('getEvents', fallbackFilter(wildcard, cAddressVal)),
      sorobanRpc('getEvents', fallbackFilter(cAddressVal, wildcard)),
    ]);
  }

  if (__DEV__) {
    console.log('[SAC events] incoming:', incomingResp?.result?.events?.length ?? 0,
      'outgoing:', outgoingResp?.result?.events?.length ?? 0);
  }

  const mapEvent = (event: any): StellarPayment | null => {
    try {
      const topics: string[] = event.topic ?? [];
      const from = String(scValToNative(xdr.ScVal.fromXDR(topics[1], 'base64')));
      const to = String(scValToNative(xdr.ScVal.fromXDR(topics[2], 'base64')));
      const amountRaw = scValToNative(xdr.ScVal.fromXDR(event.value, 'base64')) as bigint;
      return {
        id: event.id ?? event.txHash,
        transactionHash: event.txHash ?? '',
        type: 'invoke_host_function',
        from,
        to,
        amount: (Number(amountRaw) / 10_000_000).toFixed(7),
        assetType: 'native',
        createdAt: event.ledgerClosedAt ?? '',
      };
    } catch {
      return null;
    }
  };

  const incoming = (incomingResp?.result?.events ?? []).map(mapEvent).filter(Boolean) as StellarPayment[];
  const outgoing = (outgoingResp?.result?.events ?? []).map(mapEvent).filter(Boolean) as StellarPayment[];

  const seen = new Set<string>();
  return [...incoming, ...outgoing].filter((tx) => {
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
