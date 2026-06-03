/**
 * account-admin.ts — XDR builders for post-deploy admin operations on a
 * LatchSmartAccount.
 *
 * All admin ops (add/remove signer, add/remove context rule, set threshold)
 * are inherited from OZ's `SmartAccount` trait and require self-auth on the
 * smart account contract. See:
 *   reference/latch-contracts/latch-smart-account/README.md
 *
 * The functions in this module return `xdr.Operation` values; the caller is
 * responsible for assembling them into a transaction, simulating, and
 * submitting. This module does no RPC submission of its own — the one
 * networked function (`fetchFactoryVerifiers`) is a read-only simulation
 * call used to discover the verifier contract addresses the factory was
 * deployed with.
 *
 * Distinction between deploy-time and runtime signer encoding:
 *
 *   At DEPLOY TIME the factory accepts `AccountSignerInit` (with a
 *   `SignerKind` enum + raw key_data). The factory translates this into the
 *   runtime `Signer::External(verifier_address, key_data)` form internally.
 *
 *   At RUNTIME (after deploy), admin ops on the account contract take the
 *   runtime `Signer` form directly — meaning the caller must know each
 *   verifier contract's address. Use `fetchFactoryVerifiers` to discover
 *   them via the factory's `get_verifier` getter.
 */

import {
  Account,
  Address,
  Contract,
  Keypair,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

import { AccountSigner } from '@/src/lib/account-signers';
import { sorobanCall, txToBase64 } from './smart-account';

/**
 * Runtime form of the on-chain `Signer` enum (post-init).
 *
 * Note this is distinct from `AccountSigner` in account-signers.ts, which
 * is the DEPLOY-TIME form (signer_kind + key_data). At runtime the contract
 * stores the verifier address directly, so the caller must resolve it.
 */
export type RuntimeSigner =
  | { kind: 'delegated'; address: string }
  | { kind: 'external'; verifierAddress: string; keyDataHex: string };

/** Encode a RuntimeSigner to its ScVal representation. */
export function encodeRuntimeSigner(signer: RuntimeSigner): xdr.ScVal {
  if (signer.kind === 'delegated') {
    return xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('Delegated'),
      new Address(signer.address).toScVal(),
    ]);
  }
  // Signer::External(verifier, key_data) — tuple enum variant
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('External'),
    new Address(signer.verifierAddress).toScVal(),
    xdr.ScVal.scvBytes(Buffer.from(signer.keyDataHex, 'hex')),
  ]);
}

/** Lifts an `AccountSigner` (deploy-time form) into a `RuntimeSigner`. */
export function liftToRuntimeSigner(
  signer: AccountSigner,
  verifiers: FactoryVerifiers,
): RuntimeSigner {
  switch (signer.kind) {
    case 'delegated':
      return { kind: 'delegated', address: signer.address };
    case 'ed25519':
      return {
        kind: 'external',
        verifierAddress: verifiers.ed25519,
        keyDataHex: signer.publicKeyHex,
      };
    case 'webauthn':
      return {
        kind: 'external',
        verifierAddress: verifiers.webauthn,
        keyDataHex: signer.keyDataHex,
      };
  }
}

/**
 * The ContextRuleType discriminator: either the catch-all `Default` rule or
 * a `CallContract` rule scoped to a specific contract address. For Latch's
 * split-policy multisig we use `CallContract(<self>)` for the admin rule
 * so every self-mutation flows through the higher-threshold check.
 */
export type ContextRuleType =
  | { kind: 'default' }
  | { kind: 'callContract'; address: string };

function encodeContextRuleType(t: ContextRuleType): xdr.ScVal {
  if (t.kind === 'default') {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Default')]);
  }
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('CallContract'),
    new Address(t.address).toScVal(),
  ]);
}

/** SimpleThresholdAccountParams ScVal — the install payload for ThresholdPolicy. */
function encodeThresholdPolicyParams(threshold: number): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('threshold'),
      val: xdr.ScVal.scvU32(threshold),
    }),
  ]);
}

/**
 * `add_context_rule(type, name, valid_until, signers, policies)`
 *
 * Creates a named rule on the account. Common usage for split-policy
 * multisig: type=CallContract(<self>), name="admin", validUntil=null,
 * signers=current device set, policies={thresholdPolicyAddress: {threshold: N}}
 *
 * @param accountAddress       C-address of the LatchSmartAccount
 * @param ruleType             Default | CallContract(<address>)
 * @param name                 Human label (≤ ~30 chars by convention)
 * @param validUntilLedger     null = never expires
 * @param signers              Runtime signer set
 * @param thresholdPolicy      { address, threshold } to install the threshold
 *                             policy, or null for no policies
 */
export function addContextRuleOp(
  accountAddress: string,
  ruleType: ContextRuleType,
  name: string,
  validUntilLedger: number | null,
  signers: RuntimeSigner[],
  thresholdPolicy: { address: string; threshold: number } | null,
): xdr.Operation {
  const account = new Contract(accountAddress);
  const validUntil =
    validUntilLedger === null
      ? xdr.ScVal.scvVoid()
      : xdr.ScVal.scvU32(validUntilLedger);
  const signerVec = xdr.ScVal.scvVec(signers.map(encodeRuntimeSigner));
  const policiesMap = thresholdPolicy
    ? xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: new Address(thresholdPolicy.address).toScVal(),
          val: encodeThresholdPolicyParams(thresholdPolicy.threshold),
        }),
      ])
    : xdr.ScVal.scvMap([]);

  return account.call(
    'add_context_rule',
    encodeContextRuleType(ruleType),
    xdr.ScVal.scvString(name),
    validUntil,
    signerVec,
    policiesMap,
  );
}

/** `remove_context_rule(id)` */
export function removeContextRuleOp(accountAddress: string, ruleId: number): xdr.Operation {
  return new Contract(accountAddress).call('remove_context_rule', xdr.ScVal.scvU32(ruleId));
}

/** `add_signer(rule_id, signer)` — returns a stable signer u32 id on-chain. */
export function addSignerOp(
  accountAddress: string,
  ruleId: number,
  signer: RuntimeSigner,
): xdr.Operation {
  return new Contract(accountAddress).call(
    'add_signer',
    xdr.ScVal.scvU32(ruleId),
    encodeRuntimeSigner(signer),
  );
}

/** `batch_add_signer(rule_id, signers)` — adds multiple signers in one tx. */
export function batchAddSignerOp(
  accountAddress: string,
  ruleId: number,
  signers: RuntimeSigner[],
): xdr.Operation {
  return new Contract(accountAddress).call(
    'batch_add_signer',
    xdr.ScVal.scvU32(ruleId),
    xdr.ScVal.scvVec(signers.map(encodeRuntimeSigner)),
  );
}

/**
 * `remove_signer(rule_id, signer_id)`
 *
 * SAFETY: callers MUST verify that the resulting signer_count >= threshold
 * for the rule. Removing past that point makes the rule unreachable and can
 * lock the account permanently (see latch-smart-account/README.md "Risks").
 */
export function removeSignerOp(
  accountAddress: string,
  ruleId: number,
  signerId: number,
): xdr.Operation {
  return new Contract(accountAddress).call(
    'remove_signer',
    xdr.ScVal.scvU32(ruleId),
    xdr.ScVal.scvU32(signerId),
  );
}

/**
 * `ThresholdPolicy.set_threshold(threshold, context_rule, smart_account)`
 *
 * Called on the threshold-policy contract (not the account itself). The
 * context_rule argument identifies which rule's threshold to change.
 */
export function setThresholdOp(
  thresholdPolicyAddress: string,
  threshold: number,
  contextRule: ContextRuleScVal,
  smartAccountAddress: string,
): xdr.Operation {
  return new Contract(thresholdPolicyAddress).call(
    'set_threshold',
    xdr.ScVal.scvU32(threshold),
    contextRule,
    new Address(smartAccountAddress).toScVal(),
  );
}

/**
 * The ContextRule struct that `set_threshold` requires. Callers normally
 * obtain this by calling `get_context_rule(id)` on the account contract
 * and forwarding the returned ScVal opaquely.
 */
export type ContextRuleScVal = xdr.ScVal;

// ─── Factory verifier discovery ───────────────────────────────────────────

export interface FactoryVerifiers {
  ed25519: string;
  webauthn: string;
  secp256k1: string;
  thresholdPolicy: string;
}

type SimulationParams = { rpcUrl: string; networkPassphrase: string; factoryAddress: string };

/**
 * Discover the factory-deployed verifier and threshold-policy addresses by
 * simulating `get_verifier` / `get_threshold_policy` calls. Cache the
 * result — these are constants for the lifetime of a factory deployment.
 */
export async function fetchFactoryVerifiers(p: SimulationParams): Promise<FactoryVerifiers> {
  const [ed25519, webauthn, secp256k1, thresholdPolicy] = await Promise.all([
    simulateScalarCall(p, 'get_verifier', [
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Ed25519')]),
    ]),
    simulateScalarCall(p, 'get_verifier', [
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('WebAuthn')]),
    ]),
    simulateScalarCall(p, 'get_verifier', [
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Secp256k1')]),
    ]),
    simulateScalarCall(p, 'get_threshold_policy', []),
  ]);
  return { ed25519, webauthn, secp256k1, thresholdPolicy };
}

async function simulateScalarCall(
  p: SimulationParams,
  method: string,
  args: xdr.ScVal[],
): Promise<string> {
  const dummyKp = Keypair.random();
  const dummyAccount = new Account(dummyKp.publicKey(), '0');
  const contract = new Contract(p.factoryAddress);
  const tx = new TransactionBuilder(dummyAccount, {
    fee: '100',
    networkPassphrase: p.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const raw = await sorobanCall(p.rpcUrl, 'simulateTransaction', { transaction: txToBase64(tx) });
  if (raw.error) throw new Error(`${method} simulation failed: ${raw.error}`);
  const retval = xdr.ScVal.fromXDR(raw.results?.[0]?.retval ?? 'AAAAAA==', 'base64');
  return scValToNative(retval);
}
