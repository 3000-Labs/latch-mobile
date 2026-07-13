/**
 * permissions-service.ts — the seam between the session-key / policy UI and
 * the on-chain admin operations.
 *
 * PHASE 1 (current): these functions persist metadata only. No ephemeral
 * keypair is generated and nothing is submitted to chain. The session-key /
 * policy store calls through here so that PHASE 2 only replaces the bodies
 * below — the UI and store contract stay fixed.
 *
 * PHASE 2 (on-chain, single-device accounts first): each function assembles
 * the corresponding `src/api/account-admin.ts` builder and submits it through
 * an `src/lib/admin-tx.ts` orchestrator (mirroring `completePairing`). The
 * exact builders are named in each function's TODO.
 *
 * Spending limits have NO on-chain primitive — the vendored ThresholdPolicy
 * enforces signature count only (docs/multisig-contract-analysis.md §6). They
 * are persisted as a saved preference and surfaced with a "not enforced"
 * warning until a spend-limit policy contract ships.
 */

import type { SessionKey, SessionKeyAction } from '@/src/store/permissions';

export interface CreateSessionKeyParams {
  name: string;
  allowedActions: SessionKeyAction[];
  durationLabel: string;
  spendingLimit: string;
  spendingLimitAsset: string;
}

/** Duration label → lifetime in ms. PHASE 2 maps these to a valid_until ledger. */
const DURATION_MS: Record<string, number> = {
  '1 Hour': 60 * 60 * 1000,
  '1 Day': 24 * 60 * 60 * 1000,
  '1 Week': 7 * 24 * 60 * 60 * 1000,
  '1 Month': 30 * 24 * 60 * 60 * 1000,
};

// Monotonic suffix so two keys created in the same millisecond still get
// distinct ids without depending on a CSPRNG (crypto.getRandomValues isn't
// polyfilled in every RN context — see account-admin.ts SIM_SOURCE_ACCOUNT).
let seq = 0;

/**
 * Build (and, in PHASE 2, deploy) a scoped session key.
 *
 * PHASE 2: generate an ephemeral Ed25519 keypair (secret → SecureStore via
 * SECURE_KEYS), resolve `validUntilLedger` from `durationLabel`, then submit
 *   addContextRuleOp(account, { kind:'callContract', address:<dapp/SAC> },
 *     params.name, validUntilLedger, [ephemeralRuntimeSigner], null)
 * The returned `id` becomes the on-chain context-rule id used by revoke.
 */
export async function createSessionKey(
  _accountAddress: string,
  params: CreateSessionKeyParams,
): Promise<SessionKey> {
  const now = Date.now();
  const lifetime = DURATION_MS[params.durationLabel] ?? DURATION_MS['1 Hour'];
  return {
    id: `sk_${now}_${seq++}`,
    name: params.name.trim(),
    allowedActions: params.allowedActions,
    durationLabel: params.durationLabel,
    expiresAt: now + lifetime,
    spendingLimit: params.spendingLimit || '0.00',
    spendingLimitAsset: params.spendingLimitAsset || 'USDC',
    createdAt: now,
    status: 'active',
  };
}

/**
 * Revoke a session key.
 *
 * PHASE 2: removeContextRuleOp(account, <key's on-chain ruleId>) + submit.
 * Today this is a no-op; the store flips the key's status to 'revoked'.
 */
export async function revokeSessionKey(
  _accountAddress: string,
  _key: SessionKey,
): Promise<void> {
  // no-op in PHASE 1
}

/**
 * Set the M-of-N threshold for the account's admin context rule.
 *
 * PHASE 2: read the authoritative current value via fetchRuleThreshold; if it
 * changed, submit setThresholdOp(thresholdPolicy, threshold, <get_context_rule
 * ScVal>, account). MUST ride in the same tx as any signer change, or a
 * removed signer can brick the rule (docs/multisig-contract-analysis.md §6).
 */
export async function setThresholdPolicy(
  _accountAddress: string,
  _threshold: number,
): Promise<void> {
  // no-op in PHASE 1
}
