/**
 * One-off diagnostic: dump every context rule (and its signers) for a
 * LatchSmartAccount, straight from chain via read-only simulation.
 *
 *   node scripts/dump-context-rules.js <C-account-address>
 *
 * Reads RPC URL / network passphrase / factory address from .env.
 */
const fs = require('fs');
const path = require('path');
const {
  Account, Address, Contract, Keypair, Networks, TransactionBuilder, scValToNative, xdr,
} = require('@stellar/stellar-sdk');

// minimal .env loader
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const RPC = env.EXPO_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const PASS = env.EXPO_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET;
const FACTORY = env.EXPO_PUBLIC_FACTORY_ADDRESS;

const account = process.argv[2];
if (!account) { console.error('usage: node scripts/dump-context-rules.js <C-address>'); process.exit(1); }

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

async function simRead(contractAddr, fn, args) {
  const kp = Keypair.random();
  const tx = new TransactionBuilder(new Account(kp.publicKey(), '0'), { fee: '100', networkPassphrase: PASS })
    .addOperation(new Contract(contractAddr).call(fn, ...args))
    .setTimeout(30)
    .build();
  const raw = await rpc('simulateTransaction', { transaction: tx.toEnvelope().toXDR('base64') });
  if (raw.error) throw new Error(`${fn} sim error: ${raw.error}`);
  const encoded = raw.results?.[0]?.xdr ?? raw.results?.[0]?.retval;
  if (!encoded) throw new Error(`${fn}: no return value in sim result`);
  return scValToNative(xdr.ScVal.fromXDR(encoded, 'base64'));
}

async function getVerifier(kind) {
  return simRead(FACTORY, 'get_verifier', [xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(kind)])]);
}

(async () => {
  console.log('RPC      :', RPC);
  console.log('factory  :', FACTORY);
  console.log('account  :', account);
  const verifiers = {};
  for (const k of ['Ed25519', 'WebAuthn', 'Secp256k1']) {
    try { verifiers[k] = await getVerifier(k); } catch (e) { verifiers[k] = `<err ${e.message}>`; }
  }
  console.log('verifiers:', verifiers, '\n');

  const count = Number(await simRead(account, 'get_context_rules_count', []));
  console.log('get_context_rules_count =', count, '\n');

  for (let i = 0; i < count + 2; i++) {
    let rule;
    try { rule = await simRead(account, 'get_context_rule', [xdr.ScVal.scvU32(i)]); }
    catch (e) { console.log(`rule[${i}]: <no rule / ${e.message}>`); continue; }
    const ctype = Array.isArray(rule.context_type) ? rule.context_type[0] : rule.context_type;
    const signers = (rule.signers || []).map((s) => {
      const v = Array.isArray(s) ? s[0] : '?';
      if (v === 'Delegated') return `Delegated(${s[1]})`;
      if (v === 'External') {
        const verifier = String(s[1]);
        const hex = Buffer.from(s[2]).toString('hex');
        const which = Object.entries(verifiers).find(([, a]) => a === verifier)?.[0] ?? verifier;
        return `External[${which}](${hex.slice(0, 16)}…)`;
      }
      return JSON.stringify(s);
    });
    console.log(`rule[id=${rule.id} name=${JSON.stringify(rule.name)} type=${ctype}] signers(${signers.length}):`);
    for (const s of signers) console.log('   ', s);
  }
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
