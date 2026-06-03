/**
 * pairing-context.ts — small helper that resolves the auth token + local
 * signer descriptor a pairing flow needs to interact with the backend
 * pair-code endpoints and the admin-tx orchestrator.
 *
 * Used by both initiator and joiner screens in the add-device flow.
 */

import * as SecureStore from 'expo-secure-store';

import { AccountSigner } from '@/src/lib/account-signers';
import { Device, getPasskeyStorageKeys, SECURE_KEYS, WalletAccount } from '@/src/store/wallet';

export interface PairingContext {
  /** Bearer token to send to /v1/pair-codes and /v1/cosign/requests. */
  accessToken: string;
  /** Smart account C-address the pairing is for. */
  smartAccountAddress: string;
  /**
   * The local device's on-chain signer descriptor in DEPLOY-TIME form.
   * The pairing flow lifts this to a RuntimeSigner via the factory's
   * verifier addresses when building the admin tx.
   */
  localSigner: AccountSigner;
  /** Human-readable label for the local device entry. */
  localDeviceLabel: string;
}

/** Try the email-scope token first, then the wallet-scope token. */
export async function fetchAnyAccessToken(): Promise<string | null> {
  const [emailTok, walletTok] = await Promise.all([
    SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN),
    SecureStore.getItemAsync(SECURE_KEYS.WALLET_ACCESS_TOKEN),
  ]);
  return emailTok ?? walletTok ?? null;
}

/**
 * Build a PairingContext for the given account. Throws if the account is
 * not yet deployed (no smart account address) or the necessary key
 * material can't be loaded from SecureStore.
 */
export async function buildPairingContext(
  account: WalletAccount,
  listIndex: number,
): Promise<PairingContext> {
  if (!account.smartAccountAddress) {
    throw new Error('account is not yet deployed — cannot pair');
  }
  const accessToken = await fetchAnyAccessToken();
  if (!accessToken) {
    throw new Error('not signed in to Latch — cannot reach pair-code endpoints');
  }

  // Mnemonic account: derived Ed25519 key.
  if (account.index >= 0 && account.publicKeyHex) {
    return {
      accessToken,
      smartAccountAddress: account.smartAccountAddress,
      localSigner: { kind: 'ed25519', publicKeyHex: account.publicKeyHex },
      localDeviceLabel: 'This device',
    };
  }

  // Passkey account: stored P-256 credential.
  const keys = getPasskeyStorageKeys(listIndex);
  const keyDataHex =
    (await SecureStore.getItemAsync(keys.keyDataHex)) ?? account.publicKeyHex;
  if (!keyDataHex) {
    throw new Error('passkey key_data not found in SecureStore');
  }
  return {
    accessToken,
    smartAccountAddress: account.smartAccountAddress,
    localSigner: { kind: 'webauthn', keyDataHex },
    localDeviceLabel: 'This device',
  };
}

/**
 * Convert a successfully-verified pairing response into a Device record
 * the store can persist.
 */
export function deviceFromPairingResponse(
  newSigner: AccountSigner,
  label: string,
  onChainSignerId: number | null,
): Device {
  const signerKey = signerKeyOf(newSigner);
  const kind: Device['kind'] =
    newSigner.kind === 'ed25519'
      ? 'ed25519'
      : newSigner.kind === 'webauthn'
        ? 'webauthn'
        : 'delegated';
  const keyDataHex =
    newSigner.kind === 'ed25519'
      ? newSigner.publicKeyHex
      : newSigner.kind === 'webauthn'
        ? newSigner.keyDataHex
        : '';
  return {
    signerKey,
    label,
    kind,
    keyDataHex,
    onChainSignerId,
    isLocal: false,
    pairedAt: new Date().toISOString(),
  };
}

/**
 * Canonical signer-key string used for cosign signatures and device
 * identification. Matches the encoding in pairing-payload.ts so the same
 * value is used end-to-end.
 */
export function signerKeyOf(signer: AccountSigner): string {
  switch (signer.kind) {
    case 'ed25519':
      return `ed25519:${signer.publicKeyHex}`;
    case 'webauthn':
      return `webauthn:${signer.keyDataHex}`;
    case 'delegated':
      return `delegated:${signer.address}`;
  }
}
