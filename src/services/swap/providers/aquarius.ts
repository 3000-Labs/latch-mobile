import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

import { sorobanCall, txToBase64 } from '@/src/api/smart-account';
import {
  AQUARIUS_AMM_API_URL,
  AQUARIUS_ROUTER_ADDRESS,
  STELLAR_NETWORK_PASSPHRASE,
  STELLAR_RPC_URL,
} from '@/src/constants/config';
import { toBaseUnits } from '@/src/services/send-token';
import type { SwapBuildResult, SwapProvider, SwapQuote, SwapQuoteParams } from '../types';

// ─── Aquarius AMM provider (testnet) ──────────────────────────────────────────
// Soroswap has no testnet pools; Aquarius does. We discover pools via the
// Aquarius AMM API (which gives the canonical sorted tokens vec + pool index),
// quote with the router's read-only estimate_swap, and execute with swap() —
// authorized by the smart account exactly like a SAC transfer.
//
// Router ABI (verified on-chain):
//   estimate_swap(tokens: Vec<Address>, token_in, token_out, pool_index: BytesN<32>, in_amount: u128) -> u128
//   swap(user, tokens, token_in, token_out, pool_index: BytesN<32>, in_amount: u128, out_min: u128) -> u128
//
// Assumes 7-decimal tokens (XLM + classic-asset SACs, which is all the app
// surfaces). Aquarius's own 18-decimal test tokens are out of scope.

interface AquariusPool {
  index: string; // 32-byte pool hash, hex
  address: string;
  tokens_addresses: string[]; // canonical sorted order
  pool_type?: string;
}

interface AquariusRaw {
  tokens: string[]; // canonical sorted token vec for the chosen pool
  poolIndex: string; // hex
  tokenIn: string;
  tokenOut: string;
}

// Read-only simulation ignores the source account (no funds/existence/sequence
// checks), so a fixed valid G-address is fine. It is a hardcoded string — NOT
// generated with Keypair.random(), which needs crypto.getRandomValues that
// isn't available at module-load time in React Native.
const READ_SOURCE_PK = 'GBK4KZ4QNZODXXUMEYSXH7YB6OUOCIHDQTRZKK2H6DR6H4ZHHL3F6SFA';

function fromBaseUnits(base: string): string {
  const neg = base.startsWith('-');
  const digits = (neg ? base.slice(1) : base).padStart(8, '0');
  const intPart = digits.slice(0, -7).replace(/^0+(?=\d)/, '');
  const fracPart = digits.slice(-7).replace(/0+$/, '');
  const out = fracPart ? `${intPart}.${fracPart}` : intPart;
  return neg ? `-${out}` : out;
}

function tokensVec(addrs: string[]): xdr.ScVal {
  return xdr.ScVal.scvVec(addrs.map((a) => new Address(a).toScVal()));
}

function poolIndexScVal(hex: string): xdr.ScVal {
  return xdr.ScVal.scvBytes(Buffer.from(hex, 'hex'));
}

// Simulate a read-only router call (Soroban RPC via XHR per project rules) and
// return the decoded return value.
async function simulateRead(method: string, args: xdr.ScVal[]): Promise<unknown> {
  const account = new Account(READ_SOURCE_PK, '0');
  const contract = new Contract(AQUARIUS_ROUTER_ADDRESS);
  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const simRaw = await sorobanCall(STELLAR_RPC_URL, 'simulateTransaction', {
    transaction: txToBase64(tx),
  });
  if (simRaw.error) throw new Error(`Aquarius ${method}: ${simRaw.error}`);
  // The return value is in results[0].xdr (NOT .retval — that field doesn't
  // exist on the raw RPC response; parseSimResult only reads .auth correctly).
  const xdrB64 = simRaw.results?.[0]?.xdr;
  if (!xdrB64) throw new Error(`Aquarius ${method}: no return value`);
  return scValToNative(xdr.ScVal.fromXDR(xdrB64, 'base64'));
}

// Cache the pool list briefly — the discovery API paginates and changes rarely.
let poolCache: { at: number; pools: AquariusPool[] } = { at: 0, pools: [] };

async function fetchAllPools(): Promise<AquariusPool[]> {
  if (Date.now() - poolCache.at < 60_000 && poolCache.pools.length) return poolCache.pools;
  const pools: AquariusPool[] = [];
  for (let page = 1; page <= 12; page++) {
    const res = await fetch(`${AQUARIUS_AMM_API_URL}/pools/?page=${page}`);
    if (!res.ok) break;
    const json = await res.json();
    pools.push(...((json.results ?? []) as AquariusPool[]));
    if (!json.next) break;
  }
  if (pools.length) poolCache = { at: Date.now(), pools };
  return pools;
}

// All pools holding exactly { fromSacId, toSacId }.
async function poolsForPair(fromSacId: string, toSacId: string): Promise<AquariusPool[]> {
  const pools = await fetchAllPools();
  return pools.filter((p) => {
    const set = new Set(p.tokens_addresses ?? []);
    return set.size === 2 && set.has(fromSacId) && set.has(toSacId);
  });
}

export const aquariusProvider: SwapProvider = {
  id: 'aquarius',
  name: 'Aquarius',
  icon: require('@/src/assets/images/LiquidMesh.png'),

  async getQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    const { fromSacId, toSacId, amountIn, slippageBps } = params;
    const pools = await poolsForPair(fromSacId, toSacId);
    if (__DEV__) {
      console.log('[aquarius] poolsForPair', {
        from: fromSacId.slice(0, 6),
        to: toSacId.slice(0, 6),
        pools: pools.length,
      });
    }
    if (pools.length === 0) throw new Error('No Aquarius pool for this pair');

    const inBase = toBaseUnits(amountIn);

    // Estimate across candidate pools (cap to limit latency) and keep the best.
    let best: { out: bigint; pool: AquariusPool } | null = null;
    for (const pool of pools.slice(0, 4)) {
      try {
        const out = (await simulateRead('estimate_swap', [
          tokensVec(pool.tokens_addresses),
          new Address(fromSacId).toScVal(),
          new Address(toSacId).toScVal(),
          poolIndexScVal(pool.index),
          nativeToScVal(inBase, { type: 'u128' }),
        ])) as bigint;
        if (__DEV__) console.log('[aquarius] estimate', pool.index.slice(0, 8), '→', out.toString());
        if (out > 0n && (!best || out > best.out)) best = { out, pool };
      } catch (e) {
        if (__DEV__) {
          console.log('[aquarius] estimate err', pool.index.slice(0, 8), (e as Error).message?.slice(0, 80));
        }
      }
    }
    if (!best) throw new Error('No Aquarius route for this amount');

    // Price impact = how far the effective price is from the pool spot price.
    // spot = reserveOut/reserveIn; effective = amountOut/amountIn.
    let priceImpactPct = 0;
    try {
      const reserves = (await simulateRead('get_reserves', [
        tokensVec(best.pool.tokens_addresses),
        poolIndexScVal(best.pool.index),
      ])) as bigint[];
      const idxIn = best.pool.tokens_addresses.indexOf(fromSacId);
      const idxOut = best.pool.tokens_addresses.indexOf(toSacId);
      const rIn = Number(reserves[idxIn]);
      const rOut = Number(reserves[idxOut]);
      if (rIn > 0 && rOut > 0) {
        const spot = rOut / rIn;
        const effective = Number(best.out) / Number(inBase);
        priceImpactPct = Math.max(0, (1 - effective / spot) * 100);
      }
    } catch {
      // reserves unavailable (e.g. non-constant-product pool) — leave impact 0
    }

    const amountOut = fromBaseUnits(best.out.toString());
    // out_min after slippage, computed in base units to avoid float drift.
    const minOutBase = (best.out * BigInt(10_000 - slippageBps)) / 10_000n;
    const minReceived = fromBaseUnits(minOutBase.toString());
    const inNum = parseFloat(amountIn);

    const raw: AquariusRaw = {
      tokens: best.pool.tokens_addresses,
      poolIndex: best.pool.index,
      tokenIn: fromSacId,
      tokenOut: toSacId,
    };

    return {
      providerId: 'aquarius',
      amountIn,
      amountOut,
      minReceived,
      rate: inNum > 0 ? parseFloat(amountOut) / inNum : 0,
      priceImpactPct,
      fromSacId,
      toSacId,
      slippageBps,
      raw,
    };
  },

  async buildSwapOperation(quote: SwapQuote, smartAccountAddress: string): Promise<SwapBuildResult> {
    const raw = quote.raw as AquariusRaw;
    const contract = new Contract(AQUARIUS_ROUTER_ADDRESS);
    const operation = contract.call(
      'swap',
      new Address(smartAccountAddress).toScVal(), // user — authorizes & receives output
      tokensVec(raw.tokens),
      new Address(raw.tokenIn).toScVal(),
      new Address(raw.tokenOut).toScVal(),
      poolIndexScVal(raw.poolIndex),
      nativeToScVal(toBaseUnits(quote.amountIn), { type: 'u128' }),
      nativeToScVal(toBaseUnits(quote.minReceived), { type: 'u128' }),
    );
    return { operation, effectiveQuote: quote };
  },
};
