/**
 * verify-multisig-transfer.js — Phase 0 on-chain proof of the External-signer
 * single-entry multisig model (docs/multisig-contract-analysis.md §4).
 *
 *   node scripts/verify-multisig-transfer.js
 *
 * What it does, end to end, on testnet:
 *   1. Generates two ed25519 keypairs → two `External(ed25519)` signers.
 *   2. Deploys a 2-of-2 LatchSmartAccount via the factory (bundler pays).
 *   3. Funds the multisig with native-SAC XLM from the bundler.
 *   4. Builds a `transfer` FROM the multisig (multisig → bundler).
 *   5. Has BOTH device keys sign the single auth entry's digest
 *        auth_digest = sha256(payloadHash || toXDR(Vec[u32(0)]))
 *      and merges both signatures into the entry's AuthPayload.signers map.
 *   6. Bundler-signs the envelope, submits, polls for SUCCESS.
 *   7. Prints the before/after multisig balance to prove funds moved.
 *
 * This is a STANDALONE reimplementation (raw @stellar/stellar-sdk, no RN deps)
 * of the constructions in src/lib/account-signers.ts, src/lib/multisig-address.ts,
 * and src/services/send-token.ts:signSmartAccountAuthEntry — so a PASS confirms
 * the on-chain model independently of the React Native plumbing.
 *
 * Reads RPC / passphrase / factory / bundler secret from .env.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  Address,
  Asset,
  Contract,
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
} = require('@stellar/stellar-sdk');

// ─── env ────────────────────────────────────────────────────────────────────
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
}
const RPC = env.EXPO_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const PASS = env.EXPO_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET;
const FACTORY = env.EXPO_PUBLIC_FACTORY_ADDRESS;
const BUNDLER_SECRET = env.EXPO_PUBLIC_BUNDLER_SECRET;
const FRIENDBOT = 'https://friendbot.stellar.org';
const AUTH_PREFIX = 'Stellar Smart Account Auth:\n';

if (!FACTORY) throw new Error('EXPO_PUBLIC_FACTORY_ADDRESS missing in .env');
if (!BUNDLER_SECRET) throw new Error('EXPO_PUBLIC_BUNDLER_SECRET missing in .env');

const server = new rpc.Server(RPC, { allowHttp: RPC.startsWith('http://') });
const bundler = Keypair.fromSecret(BUNDLER_SECRET);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest();
const log = (...a) => console.log(...a);

// ─── tx helpers ──────────────────────────────────────────────────────────────

/**
 * Simulate → assemble → sign(bundler) → send → poll. Returns the success tx
 * response. `onSim(sim)` may mutate the simulated auth entries (e.g. pin
 * expiration) and OPTIONALLY return an array of finalized auth entries to
 * splice into op[0].auth at the XDR level (the signed/aggregated multisig entry).
 */
async function runContractTx(buildOp, onSim) {
  const source = await server.getAccount(bundler.publicKey());
  const tx = new TransactionBuilder(source, { fee: '2000000', networkPassphrase: PASS })
    .addOperation(buildOp())
    .setTimeout(120)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`simulation failed: ${sim.error}`);

  const finalEntries = onSim ? onSim(sim) : undefined;

  let assembled = rpc.assembleTransaction(tx, sim).build();
  if (finalEntries) {
    // The recording sim STUBS __check_auth, so its footprint/resources omit the
    // multisig's ContextRuleData + verifier/threshold reads. Splice the signed
    // auth in and run an ENFORCING simulation: the host now executes __check_auth
    // for real, validating both signatures and returning the COMPLETE footprint
    // + resources (docs/multisig-contract-analysis.md §3; concerns §5f/§6j).
    const interim = new Transaction(setOpAuth(assembled.toXDR(), finalEntries), PASS);
    const sim2 = await server.simulateTransaction(interim);
    if (rpc.Api.isSimulationError(sim2)) {
      throw new Error(`enforcing simulation (runs __check_auth) failed: ${sim2.error}`);
    }
    // Re-assemble with the enforcing footprint/fees, then re-assert the signed auth
    // (assembleTransaction rewrites op.auth from its own sim recommendation).
    const reassembled = rpc.assembleTransaction(interim, sim2).build();
    assembled = new Transaction(setOpAuth(reassembled.toXDR(), finalEntries), PASS);
  }

  assembled.sign(bundler);
  const sent = await server.sendTransaction(assembled);
  if (sent.status === 'ERROR') {
    throw new Error(`sendTransaction ERROR: ${JSON.stringify(sent.errorResult?.result() ?? sent)}`);
  }
  return pollTx(sent.hash);
}

async function pollTx(hash) {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await server.getTransaction(hash);
    if (res.status === 'NOT_FOUND') continue;
    if (res.status === 'SUCCESS') return { hash, res };
    throw new Error(`tx ${hash} status ${res.status}: ${res.resultXdr?.toXDR?.('base64') ?? ''}`);
  }
  throw new Error(`tx ${hash} did not confirm in 30s`);
}

/** Replace the first InvokeHostFunction op's auth array at the XDR level. */
function setOpAuth(txXdr, entries) {
  const envlp = xdr.TransactionEnvelope.fromXDR(txXdr, 'base64');
  const op = envlp.v1().tx().operations()[0].body();
  op.invokeHostFunctionOp().auth(entries);
  return envlp.toXDR('base64');
}

// ─── signer / digest construction (mirrors send-token.ts) ─────────────────────

/** AccountSignerInit::External(Ed25519) — deploy-time signer ScVal. */
function ed25519SignerInit(pk32) {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('External'),
    xdr.ScVal.scvMap([
      new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('key_data'), val: xdr.ScVal.scvBytes(pk32) }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('signer_kind'),
        val: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Ed25519')]),
      }),
    ]),
  ]);
}

/** Runtime External(verifier, pk) signer key used inside the AuthPayload map. */
function runtimeExternalKey(verifier, pk32) {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('External'),
    new Address(verifier).toScVal(),
    xdr.ScVal.scvBytes(pk32),
  ]);
}

/** payloadHash = sha256(HashIdPreimage(ENVELOPE_TYPE_SOROBAN_AUTHORIZATION)). */
function hashAuthPayload(entry) {
  const a = entry.credentials().address();
  const preimage = xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
    new xdr.HashIdPreimageSorobanAuthorization({
      networkId: sha256(Buffer.from(PASS)),
      nonce: a.nonce(),
      invocation: entry.rootInvocation(),
      signatureExpirationLedger: a.signatureExpirationLedger(),
    }),
  );
  return sha256(preimage.toXDR());
}

/** One signer pair { keyScVal, sigBytes } for the AuthPayload.signers map. */
function signEntry(entry, kp, verifier) {
  const payloadHash = hashAuthPayload(entry);
  const ruleIdsXdr = xdr.ScVal.scvVec([xdr.ScVal.scvU32(0)]).toXDR();
  const authDigest = sha256(Buffer.concat([payloadHash, ruleIdsXdr]));
  const message = AUTH_PREFIX + authDigest.toString('hex').toLowerCase();
  const sig = kp.sign(Buffer.from(message, 'utf8'));
  const pk32 = kp.rawPublicKey();
  return { keyScVal: runtimeExternalKey(verifier, pk32), sigBytes: sig };
}

/**
 * Build the ONE aggregated auth entry: a single AuthPayload whose signers map
 * carries both members' signatures (keys sorted by canonical XDR bytes). This
 * is exactly what aggregateAuthEntries produces from two single-signer entries.
 */
function buildAggregatedEntry(entry, pairs) {
  const sorted = [...pairs].sort((x, y) =>
    Buffer.compare(x.keyScVal.toXDR(), y.keyScVal.toXDR()),
  );
  const signersMap = xdr.ScVal.scvMap(
    sorted.map(
      (p) => new xdr.ScMapEntry({ key: p.keyScVal, val: xdr.ScVal.scvBytes(p.sigBytes) }),
    ),
  );
  const authPayload = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('context_rule_ids'),
      val: xdr.ScVal.scvVec([xdr.ScVal.scvU32(0)]),
    }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('signers'), val: signersMap }),
  ]);
  entry.credentials().address().signature(authPayload);
  return entry;
}

// ─── factory reads ────────────────────────────────────────────────────────────

async function simRead(contractId, method, args) {
  const source = new (require('@stellar/stellar-sdk').Account)(
    'GA5WUJ54Z23KILLCUOUNAKTPBVZWKMQVO4O6EQ5GHLAERIMLLHNCSKYH',
    '0',
  );
  const tx = new TransactionBuilder(source, { fee: '100', networkPassphrase: PASS })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`${method}: ${sim.error}`);
  return scValToNative(sim.result.retval);
}

/** The factory's ed25519 verifier — discovered, not trusted from env. */
function ed25519Verifier() {
  return simRead(FACTORY, 'get_verifier', [xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Ed25519')])]);
}

/** Deterministic salt = sha256("latch-multisig-v1|<threshold>|<sorted ed25519:hex keys>"). */
function deriveSalt(signerKeysHex, threshold) {
  const sorted = signerKeysHex.map((h) => `ed25519:${h}`).sort();
  const payload = ['latch-multisig-v1', String(threshold), ...sorted].join('|');
  return sha256(Buffer.from(payload, 'utf8'));
}

async function nativeBalance(cAddress) {
  try {
    const v = await simRead(Asset.native().contractId(PASS), 'balance', [
      new Address(cAddress).toScVal(),
    ]);
    return BigInt(v).toString();
  } catch (e) {
    return `?(${e.message})`;
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('▶ RPC', RPC);
  log('▶ factory', FACTORY);
  log('▶ bundler', bundler.publicKey());

  // Ensure the bundler is funded (testnet).
  try {
    await server.getAccount(bundler.publicKey());
  } catch {
    log('• bundler not found — requesting friendbot funding');
    await fetch(`${FRIENDBOT}?addr=${bundler.publicKey()}`);
  }

  const verifier = await ed25519Verifier();
  log('▶ ed25519 verifier', verifier);

  // 1. Two device keys → two External signers.
  const kpA = Keypair.random();
  const kpB = Keypair.random();
  const keysHex = [kpA, kpB].map((k) => Buffer.from(k.rawPublicKey()).toString('hex'));
  log('▶ signer A', kpA.publicKey());
  log('▶ signer B', kpB.publicKey());

  // 2. Deploy a 2-of-2 multisig (signers sorted by canonical key, like the app).
  const threshold = 2;
  const sortedKeysHex = [...keysHex].sort();
  const salt = deriveSalt(keysHex, threshold);
  const signerScVals = sortedKeysHex.map((h) => ed25519SignerInit(Buffer.from(h, 'hex')));
  const initParams = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('account_salt'), val: xdr.ScVal.scvBytes(salt) }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('signers'), val: xdr.ScVal.scvVec(signerScVals) }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('threshold'), val: xdr.ScVal.scvU32(threshold) }),
  ]);

  log('\n── deploying 2-of-2 multisig ──');
  const deploy = await runContractTx(() => new Contract(FACTORY).call('create_account', initParams));
  const multisig = scValToNative(deploy.res.returnValue);
  log('✓ deployed', multisig, '(tx', deploy.hash + ')');

  // 3. Fund the multisig with 5 XLM via the native SAC.
  const nativeSac = Asset.native().contractId(PASS);
  log('\n── funding multisig (5 XLM via native SAC) ──');
  await runContractTx(() =>
    new Contract(nativeSac).call(
      'transfer',
      new Address(bundler.publicKey()).toScVal(),
      new Address(multisig).toScVal(),
      nativeToScVal('50000000', { type: 'i128' }),
    ),
  );
  const before = await nativeBalance(multisig);
  log('✓ multisig balance (stroops):', before);

  // 4–6. Transfer 1 XLM FROM the multisig, signed by BOTH members.
  log('\n── multisig transfer (1 XLM → bundler), 2-of-2 ──');
  const result = await runContractTx(
    () =>
      new Contract(nativeSac).call(
        'transfer',
        new Address(multisig).toScVal(),
        new Address(bundler.publicKey()).toScVal(),
        nativeToScVal('10000000', { type: 'i128' }),
      ),
    (sim) => {
      const entries = sim.result.auth ?? [];
      const entry = entries.find(
        (e) => e.credentials().switch().name === 'sorobanCredentialsAddress',
      );
      if (!entry) throw new Error('no address-credentials auth entry in simulation');
      log(`  sim returned ${entries.length} auth entr${entries.length === 1 ? 'y' : 'ies'}`);

      // Pin expiration, then sign the SAME entry with both device keys and merge
      // both signatures into one AuthPayload.signers map (the §4 aggregate).
      entry.credentials().address().signatureExpirationLedger(sim.latestLedger + 100);
      const pairs = [signEntry(entry, kpA, verifier), signEntry(entry, kpB, verifier)];
      return [buildAggregatedEntry(entry, pairs)];
    },
  );

  const after = await nativeBalance(multisig);
  log('✓ transfer tx', result.hash, '→ SUCCESS');
  log('▶ multisig balance before:', before);
  log('▶ multisig balance after :', after);

  const moved = BigInt(before) - BigInt(after);
  log('\n═══════════════════════════════════════════════');
  if (moved >= 10000000n) {
    log('✅ PASS — 2-of-2 External multisig transfer confirmed on-chain.');
    log(`   ${moved} stroops moved (fee-inclusive ≥ 1 XLM transfer).`);
  } else {
    log('⚠️  Tx succeeded but balance delta unexpected:', moved.toString());
  }
  log('═══════════════════════════════════════════════');
}

main().catch((e) => {
  console.error('\n❌ FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
