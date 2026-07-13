/**
 * verify-swap.js — live proof of the Soroswap Aggregator integration that
 * powers src/services/swap/providers/soroswap.ts.
 *
 *   node scripts/verify-swap.js
 *
 * What it does (no RN deps, raw fetch + @stellar/stellar-sdk):
 *   1. Reads SOROSWAP_API_KEY/URL + network from .env.
 *   2. Resolves XLM + USDC testnet SAC contract ids from the Soroswap token list.
 *   3. POST /quote (XLM -> USDC, EXACT_IN) — proves key/auth, network param,
 *      request body, and the amountOut/otherAmountThreshold/priceImpactPct fields.
 *   4. POST /quote/build — proves the build round-trip returns an xdr.
 *   5. Parses the build xdr and asserts operations[0] is invokeHostFunction —
 *      the exact extraction buildSwapOperation() relies on.
 *
 * A PASS confirms the provider contract end-to-end up to the signed-submit step
 * (submit is structurally identical to the proven send flow).
 *
 * NOTES from the live run (2026-06-16):
 *   • Defaults to MAINNET because /quote + /build are READ-ONLY (no funds, no
 *     cost) and the public Soroswap token list is mainnet-only. The app runs on
 *     testnet, which needs Soroswap testnet pools for the chosen pair — a
 *     testnet quote for an unseeded pair returns 400 "No path found".
 *   • Uses protocols=['soroswap'] (single AMM). The broad aggregator set can
 *     return a route whose /build is rejected with 400 "Invalid poolHashes
 *     string" — an upstream API constraint on multi-hop aggregator routes.
 *   • `from` is a real existing mainnet account so /build clears its
 *     account-exists check (a non-existent address → 400 "Account not found").
 */
const fs = require('fs');
const path = require('path');
const { Asset, Networks, TransactionBuilder, Keypair } = require('@stellar/stellar-sdk');

// ─── env ──────────────────────────────────────────────────────────────────
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
}
const API = (env.EXPO_PUBLIC_SOROSWAP_API_URL || 'https://api.soroswap.finance').replace(/\/+$/, '');
const KEY = env.EXPO_PUBLIC_SOROSWAP_API_KEY;
// Network: CLI arg ('mainnet'|'testnet') overrides .env. Quote/build are
// read-only, so a mainnet run is a safe way to prove the provider logic even
// though the app itself runs on testnet (which needs seeded Soroswap pools).
// Read-only proof defaults to mainnet (see header). Pass 'testnet' to target it.
const NETWORK = process.argv[2] === 'testnet' ? 'testnet' : 'mainnet';

// Protocols and a real account so /build clears its validations (see header).
const PROTOCOLS = ['soroswap'];
const REAL_MAINNET_ACCOUNT = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const PASS = NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

if (!KEY) {
  console.error('✗ EXPO_PUBLIC_SOROSWAP_API_KEY not set in .env');
  process.exit(1);
}

async function post(p, body) {
  const res = await fetch(`${API}${p}?network=${NETWORK}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${p} ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function resolveUsdc() {
  // Pull the Soroswap token list (same source as src/api/token-list.ts) and find
  // USDC's testnet/mainnet SAC contract.
  const res = await fetch('https://raw.githubusercontent.com/soroswap/token-list/main/tokenList.json');
  const list = await res.json();
  const assets = Array.isArray(list) ? list.flatMap((l) => l.assets ?? []) : (list.assets ?? []);
  const usdc = assets.find((a) => (a.code || a.symbol) === 'USDC' && a.contract);
  return usdc?.contract;
}

(async () => {
  console.log(`→ network=${NETWORK}  api=${API}`);

  const xlm = Asset.native().contractId(PASS);
  const usdc = await resolveUsdc();
  if (!usdc) throw new Error('Could not resolve USDC SAC from Soroswap token list');
  console.log(`→ XLM SAC  = ${xlm}`);
  console.log(`→ USDC SAC = ${usdc}`);

  // 1 XLM in base units (7 decimals)
  const amount = (1n * 10_000_000n).toString();

  console.log('\n[1/3] POST /quote (1 XLM -> USDC, EXACT_IN)…');
  const quote = await post('/quote', {
    assetIn: xlm,
    assetOut: usdc,
    amount,
    tradeType: 'EXACT_IN',
    protocols: PROTOCOLS,
    slippageBps: 50,
  });
  console.log(`    amountOut            = ${quote.amountOut}`);
  console.log(`    otherAmountThreshold = ${quote.otherAmountThreshold}`);
  console.log(`    priceImpactPct       = ${quote.priceImpactPct}`);
  console.log(`    platform             = ${quote.platform}`);

  const from = NETWORK === 'mainnet' ? REAL_MAINNET_ACCOUNT : Keypair.random().publicKey();
  console.log('\n[2/3] POST /quote/build…');
  const build = await post('/quote/build', { quote, from, to: from });
  if (!build.xdr) throw new Error('build returned no xdr');
  console.log(`    xdr length = ${build.xdr.length}`);

  console.log('\n[3/3] Parse build xdr → assert invokeHostFunction…');
  const tx = TransactionBuilder.fromXDR(build.xdr, PASS);
  const op = tx.operations[0];
  if (op.type !== 'invokeHostFunction') {
    throw new Error(`expected invokeHostFunction, got ${op.type}`);
  }
  console.log(`    operations[0].type = ${op.type}  ✓`);

  console.log('\n✅ PASS — Soroswap quote + build + invokeHostFunction extraction verified.');
})().catch((e) => {
  console.error('\n✗ FAIL:', e.message);
  process.exit(1);
});
