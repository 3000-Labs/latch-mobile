import { Address, Asset, Horizon, scValToNative, xdr } from '@stellar/stellar-sdk';
import { useQuery } from '@tanstack/react-query';
import { HORIZON_URL, STELLAR_NETWORK_PASSPHRASE, STELLAR_RPC_URL } from '../constants/config';

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

/**
 * XHR-based Soroban JSON-RPC call.
 * Uses XMLHttpRequest instead of Axios/fetch because the Stellar SDK's Axios transport
 * fails on Android with "Network Error". XHR routes through OkHttp and respects the
 * platform TLS stack (same pattern as smart-account.ts and passkey.ts).
 */
function sorobanRpc(method: string, params: object): Promise<any> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', STELLAR_RPC_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 15000;
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve({});
      }
    };
    xhr.onerror = () => resolve({});
    xhr.ontimeout = () => resolve({});
    xhr.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
  });
}

/** Encode an ScVal to base64 XDR using a byte-loop (avoids Buffer polyfill issues). */
function scValB64(val: xdr.ScVal): string {
  const bytes = new Uint8Array(val.toXDR());
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

/**
 * Query native SAC transfer events for a C-address via Soroban RPC getEvents.
 *
 * Horizon's operations().forAccount(cAddress) only indexes the SOURCE account
 * (the signer), so a SAC transfer from G→C appears under the G-address, not the C.
 * The SAC emits a `transfer` event for every XLM transfer with:
 *   topic[0]: Symbol("transfer")
 *   topic[1]: Address(from)
 *   topic[2]: Address(to)
 *   value:    Int128(amount_in_stroops)
 *
 * We make two parallel getEvents calls — one for incoming (to==cAddress),
 * one for outgoing (from==cAddress) — and merge the results.
 */
async function fetchSacTransferEvents(cAddress: string): Promise<StellarPayment[]> {
  const nativeSacId = Asset.native().contractId(STELLAR_NETWORK_PASSPHRASE);

  // Get the latest ledger to anchor a ~7-day look-back window
  const latestLedgerResp = await sorobanRpc('getLatestLedger', {});
  const latestLedger: number = latestLedgerResp?.result?.sequence ?? 0;
  // If getLatestLedger fails (XHR resolves as {} → sequence undefined), use a conservative
  // fallback rather than bailing — this keeps event queries alive even if the first RPC call fails.
  const startLedger = latestLedger > 0 ? Math.max(1, latestLedger - 100_000) : 1;
  if (__DEV__) {
    console.log('[SAC events] nativeSacId:', nativeSacId);
    console.log('[SAC events] cAddress:', cAddress);
    console.log('[SAC events] latestLedger:', latestLedger, 'startLedger:', startLedger);
  }

  const transferSym = scValB64(xdr.ScVal.scvSymbol('transfer'));
  const cAddressVal = scValB64(new Address(cAddress).toScVal());
  const wildcard = '*';

  // Native SAC transfer events emit 4 topics: [Symbol("transfer"), Address(from), Address(to), String("native")]
  // Confirmed from on-chain explorer. Stellar RPC getEvents uses fixed-length topic matching —
  // filter must have the same number of positions as the emitted event.
  const makeFilter = (senderFilter: string, recipientFilter: string) => ({
    startLedger,
    filters: [
      {
        type: 'contract',
        contractIds: [nativeSacId],
        topics: [
          [transferSym], // topic[0] = Symbol("transfer")
          [senderFilter], // topic[1] = from address (or wildcard "*")
          [recipientFilter], // topic[2] = to address (or wildcard "*")
          [wildcard], // topic[3] = String("native") — wildcard matches any asset name
        ],
      },
    ],
    pagination: { limit: 20 },
  });

  // Diagnostic: fetch ANY transfer events (no address filter) to verify contract ID + startLedger
  if (__DEV__) {
    const diag = await sorobanRpc('getEvents', {
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [nativeSacId],
          topics: [[transferSym], [wildcard], [wildcard], [wildcard]],
        },
      ],
      pagination: { limit: 3 },
    });
    console.log('[SAC events] diagnostic (any transfer, no addr filter):', JSON.stringify(diag));
  }

  const [incomingResp, outgoingResp] = await Promise.all([
    sorobanRpc('getEvents', makeFilter(wildcard, cAddressVal)), // incoming: to == cAddress
    sorobanRpc('getEvents', makeFilter(cAddressVal, wildcard)), // outgoing: from == cAddress
  ]);

  if (__DEV__) {
    console.log(
      '[SAC events] incoming filter sent:',
      JSON.stringify(makeFilter(wildcard, cAddressVal)),
    );
    console.log('[SAC events] incomingResp:', JSON.stringify(incomingResp));
    console.log('[SAC events] outgoingResp:', JSON.stringify(outgoingResp));
  }

  const mapEvent = (event: any): StellarPayment | null => {
    try {
      const topics: string[] = event.topic ?? [];
      const from = String(scValToNative(xdr.ScVal.fromXDR(topics[1], 'base64')));
      const to = String(scValToNative(xdr.ScVal.fromXDR(topics[2], 'base64')));
      const amountRaw = scValToNative(xdr.ScVal.fromXDR(event.value, 'base64')) as bigint;
      const amount = (Number(amountRaw) / 10_000_000).toFixed(7);
      return {
        id: event.id ?? event.txHash,
        transactionHash: event.txHash ?? '',
        type: 'invoke_host_function',
        from,
        to,
        amount,
        assetType: 'native',
        createdAt: event.ledgerClosedAt ?? '',
      };
    } catch {
      return null;
    }
  };

  const incoming: StellarPayment[] = (incomingResp?.result?.events ?? [])
    .map(mapEvent)
    .filter(Boolean) as StellarPayment[];
  const outgoing: StellarPayment[] = (outgoingResp?.result?.events ?? [])
    .map(mapEvent)
    .filter(Boolean) as StellarPayment[];

  // Deduplicate between the two calls (an event that is both from and to the same address)
  const seen = new Set<string>();
  return [...incoming, ...outgoing].filter((tx) => {
    if (seen.has(tx.transactionHash)) return false;
    seen.add(tx.transactionHash);
    return true;
  });
}

/** Fetch classic Stellar operations (payments, create_account) via Horizon. */
async function fetchHorizonOperations(address: string): Promise<StellarPayment[]> {
  const server = new Horizon.Server(HORIZON_URL);
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

    if (
      record.type === 'payment' ||
      record.type === 'path_payment_strict_receive' ||
      record.type === 'path_payment_strict_send'
    ) {
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

    // Other op types (invoke_host_function surfaced via Horizon) — best effort
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

export async function fetchStellarPayments(address: string): Promise<StellarPayment[]> {
  const [horizonResult, sacResult] = await Promise.allSettled([
    fetchHorizonOperations(address),
    fetchSacTransferEvents(address),
  ]);

  const horizon = horizonResult.status === 'fulfilled' ? horizonResult.value : [];
  const sacEvents = sacResult.status === 'fulfilled' ? sacResult.value : [];
  // console.log({ horizonResult, sacResult });
  // Merge, deduplicate by transactionHash, sort newest first
  const seen = new Set<string>();
  const merged = [...sacEvents, ...horizon].filter((tx) => {
    if (!tx.transactionHash || seen.has(tx.transactionHash)) return false;
    seen.add(tx.transactionHash);
    return true;
  });

  return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
