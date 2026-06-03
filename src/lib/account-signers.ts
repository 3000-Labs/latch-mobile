/**
 * Shared encoding for AccountInitParams and AccountSigner ScVals.
 *
 * Used by:
 *   - src/api/smart-account.ts (Ed25519 mobile seed-wallet deploys)
 *   - src/api/passkey.ts       (WebAuthn passkey deploys)
 *   - src/api/account-admin.ts (post-deploy admin ops: add_signer, etc.)
 *
 * The on-chain factory canonicalises signers and validates the threshold
 * (1 ≤ threshold ≤ signer_count). See
 * reference/latch-contracts/latch-account-factory/contracts/factory-contract/src/lib.rs.
 *
 * Soroban map encoding requires fields in alphabetical key order — the
 * helpers below enforce that so callers can't accidentally break the
 * encoding.
 */

import { Address, xdr } from '@stellar/stellar-sdk';

/**
 * A single signer in the format the factory accepts.
 *
 * - `ed25519`  — 32-byte raw Ed25519 public key (hex). Mobile seed wallets.
 * - `webauthn` — 65-byte uncompressed P-256 pubkey + credential ID, packed
 *                per the latch-mobile passkey-webauthn convention (hex).
 * - `delegated` — uses native Stellar account authorization. Address is a
 *                 G… (account) or C… (contract) address.
 */
export type AccountSigner =
  | { kind: 'ed25519'; publicKeyHex: string }
  | { kind: 'webauthn'; keyDataHex: string }
  | { kind: 'delegated'; address: string };

/** External signer kinds (the contract's SignerKind enum). */
type ExternalSignerKind = 'Ed25519' | 'WebAuthn' | 'Secp256k1';

function externalSignerScVal(kind: ExternalSignerKind, keyDataHex: string): xdr.ScVal {
  // ExternalSignerInit struct — fields must be in alphabetical key order
  const init = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('key_data'),
      val: xdr.ScVal.scvBytes(Buffer.from(keyDataHex, 'hex')),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('signer_kind'),
      // Unit enum variant: Vec([Symbol(kind)])
      val: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(kind)]),
    }),
  ]);
  // AccountSignerInit::External(ExternalSignerInit) — tuple enum variant
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('External'), init]);
}

function delegatedSignerScVal(address: string): xdr.ScVal {
  // AccountSignerInit::Delegated(Address) — tuple enum variant
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('Delegated'),
    new Address(address).toScVal(),
  ]);
}

/** Encode a single AccountSigner to its ScVal representation. */
export function encodeAccountSigner(signer: AccountSigner): xdr.ScVal {
  switch (signer.kind) {
    case 'ed25519':
      return externalSignerScVal('Ed25519', signer.publicKeyHex);
    case 'webauthn':
      return externalSignerScVal('WebAuthn', signer.keyDataHex);
    case 'delegated':
      return delegatedSignerScVal(signer.address);
  }
}

export interface AccountInitParams {
  signers: AccountSigner[];
  /**
   * 1 ≤ threshold ≤ signers.length. When `undefined`, the factory picks a
   * sensible default (1 for a single signer; rejects for multi-signer).
   */
  threshold?: number;
  /** 32-byte deterministic salt that pins the deployed C-address. */
  salt: Buffer;
}

/**
 * Encode the AccountInitParams struct ScVal passed to `create_account` and
 * `get_account_address` on the factory. Fields are emitted in alphabetical
 * key order as Soroban map encoding requires.
 */
export function encodeAccountInitParams(params: AccountInitParams): xdr.ScVal {
  if (params.signers.length === 0) {
    throw new Error('AccountInitParams.signers must be non-empty');
  }
  if (
    params.threshold !== undefined &&
    (params.threshold < 1 || params.threshold > params.signers.length)
  ) {
    throw new Error(
      `AccountInitParams.threshold must be in [1, signers.length=${params.signers.length}]`,
    );
  }

  const signerScVals = params.signers.map(encodeAccountSigner);

  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('account_salt'),
      val: xdr.ScVal.scvBytes(params.salt),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('signers'),
      val: xdr.ScVal.scvVec(signerScVals),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('threshold'),
      val:
        params.threshold === undefined
          ? xdr.ScVal.scvVoid()
          : xdr.ScVal.scvU32(params.threshold),
    }),
  ]);
}

/**
 * Majority threshold for an N-signer admin rule. ⌈N/2⌉ is the project-wide
 * choice: tolerates losing a minority of devices while requiring more than a
 * single compromised device to authorise admin ops.
 */
export function computeMajorityThreshold(signerCount: number): number {
  if (signerCount < 1) throw new Error('signerCount must be >= 1');
  return Math.ceil(signerCount / 2);
}
