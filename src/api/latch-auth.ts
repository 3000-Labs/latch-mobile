/**
 * latch-auth.ts — Latch backend API for auth, backup, and account recovery.
 *
 * Backup is encrypted client-side (Argon2id + AES-256-GCM) before upload.
 * The backend stores and returns an opaque ciphertext blob and never sees
 * plaintext credentials.
 */

import * as SecureStore from 'expo-secure-store';
import { decryptBackup, encryptBackup, type EncryptedBackup } from '../lib/backup-crypto';
import { getPasskeyStorageKeys, SECURE_KEYS, type WalletAccount } from '../store/wallet';

const API_ROOT = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const API_BASE = `${API_ROOT}/v1`;

// Raw XHR — resolves with { status, body } so callers can inspect the status
// before deciding whether to throw. Never rejects on HTTP errors; only rejects
// on network failure or timeout.
function xhrRaw(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method ?? 'GET', `${API_BASE}${path}`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 30000;
    xhr.onload = () => {
      try {
        resolve({ status: xhr.status, body: JSON.parse(xhr.responseText) });
      } catch {
        resolve({ status: xhr.status, body: null });
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Request timed out'));
    xhr.send(options.body as string | undefined);
  });
}

// Attempt a silent token refresh. Returns the new access token on success, null
// if the refresh token is missing or the server rejects it.
async function silentRefresh(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) return null;
  try {
    const { status, body } = await xhrRaw('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (status !== 200 || !body?.data?.access_token) return null;
    await Promise.all([
      SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, body.data.access_token),
      SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, body.data.refresh_token),
    ]);
    return body.data.access_token as string;
  } catch {
    return null;
  }
}

// latchFetch wraps xhrRaw with a single 401 → refresh → retry cycle.
// On a 401, it calls silentRefresh and retries once with the new token.
// All other 4xx/5xx statuses throw immediately.
async function latchFetch(path: string, options: RequestInit = {}, token?: string): Promise<any> {
  let { status, body } = await xhrRaw(path, options, token);

  if (status === 401 && token) {
    const newToken = await silentRefresh();
    if (newToken) {
      ({ status, body } = await xhrRaw(path, options, newToken));
    }
  }

  if (status >= 400) {
    throw new Error(body?.error?.message ?? `Request failed (${status})`);
  }
  return body?.data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Register an email address and trigger an OTP. Always resolves (backend
 * returns 200 regardless of whether the email already exists).
 */
export async function registerEmail(email: string): Promise<void> {
  await latchFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify a registration OTP. Returns access + refresh tokens on success.
 */
export async function verifyOTP(
  email: string,
  otp: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const data = await latchFetch('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

/**
 * Persist auth tokens and email to SecureStore after a successful OTP verify.
 */
export async function saveAuthTokens(
  accessToken: string,
  refreshToken: string,
  email: string,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, accessToken),
    SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, refreshToken),
    SecureStore.setItemAsync(SECURE_KEYS.USER_EMAIL, email),
  ]);
}

// ─── Backup ───────────────────────────────────────────────────────────────────

/**
 * Upload an encrypted credential backup to the Latch backend.
 *
 * Credentials are encrypted on-device with Argon2id + AES-256-GCM before
 * leaving the phone. The backend stores the opaque ciphertext and cannot
 * read or decrypt it.
 *
 * Requires SECURE_KEYS.RECOVERY_PASSWORD_SESSION to be set (written by the
 * set-recovery-password onboarding screen). Deletes the session key after a
 * successful upload so it does not linger in SecureStore.
 */
export async function uploadBackup(): Promise<void> {
  const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  if (!accessToken) throw new Error('Not authenticated — cannot upload backup');

  const password = await SecureStore.getItemAsync(SECURE_KEYS.RECOVERY_PASSWORD_SESSION);
  if (!password) throw new Error('No recovery password set');

  const [passkeyPrivateKey, credentialId, keyDataHex, smartAccount, mnemonic, accountsJson] =
    await Promise.all([
      SecureStore.getItemAsync(SECURE_KEYS.PASSKEY_PRIVATE_KEY),
      SecureStore.getItemAsync(SECURE_KEYS.CREDENTIAL_ID),
      SecureStore.getItemAsync(SECURE_KEYS.KEY_DATA_HEX),
      SecureStore.getItemAsync(SECURE_KEYS.SMART_ACCOUNT),
      SecureStore.getItemAsync(SECURE_KEYS.MNEMONIC),
      SecureStore.getItemAsync(SECURE_KEYS.ACCOUNTS),
    ]);

  const blob: Record<string, string> = { version: '2' };
  if (passkeyPrivateKey) blob.passkey_private_key = passkeyPrivateKey;
  if (credentialId) blob.credential_id = credentialId;
  if (keyDataHex) blob.key_data_hex = keyDataHex;
  if (smartAccount) blob.smart_account = smartAccount;
  if (mnemonic) blob.mnemonic = mnemonic;
  if (accountsJson) blob.accounts = accountsJson;

  // Back up indexed passkey keys for any additional passkey accounts (list index 1+).
  if (accountsJson) {
    const accounts = JSON.parse(accountsJson) as WalletAccount[];
    const indexedReads = accounts
      .map((account, listIndex) => ({ account, listIndex }))
      .filter(({ account, listIndex }) => account.index < 0 && listIndex > 0)
      .map(async ({ listIndex }) => {
        const keys = getPasskeyStorageKeys(listIndex);
        const [pk, cid, kdh] = await Promise.all([
          SecureStore.getItemAsync(keys.privateKey),
          SecureStore.getItemAsync(keys.credentialId),
          SecureStore.getItemAsync(keys.keyDataHex),
        ]);
        return { listIndex, pk, cid, kdh };
      });

    for (const { listIndex, pk, cid, kdh } of await Promise.all(indexedReads)) {
      if (pk) blob[`passkey_private_key_${listIndex}`] = pk;
      if (cid) blob[`credential_id_${listIndex}`] = cid;
      if (kdh) blob[`key_data_hex_${listIndex}`] = kdh;
    }
  }

  const encryptedBlob = encryptBackup(JSON.stringify(blob), password);

  await latchFetch(
    '/backup',
    {
      method: 'POST',
      body: JSON.stringify({ encrypted_blob: encryptedBlob, smart_account_address: smartAccount ?? '' }),
    },
    accessToken,
  );

  // Session key is no longer needed — delete immediately after successful upload.
  await SecureStore.deleteItemAsync(SECURE_KEYS.RECOVERY_PASSWORD_SESSION);
}

// ─── Recovery ─────────────────────────────────────────────────────────────────

/**
 * Send a recovery OTP to the given email.
 * Always resolves — backend returns 200 regardless of whether account exists.
 */
export async function initiateRecovery(email: string): Promise<void> {
  await latchFetch('/recovery/initiate', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify a recovery OTP. Returns a short-lived recovery token (15 min TTL).
 */
export async function verifyRecoveryOTP(email: string, otp: string): Promise<string> {
  const data = await latchFetch('/recovery/verify', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
  return data.recovery_token;
}

/**
 * Fetch the encrypted backup blob, decrypt it client-side, and restore all
 * keys to SecureStore. Called after a successful recovery OTP verify.
 *
 * Throws 'Incorrect recovery password' if the password is wrong (GCM auth tag
 * mismatch), so the caller can surface a user-facing error.
 */
export async function fetchAndRestoreBackup(
  recoveryToken: string,
  password: string,
): Promise<void> {
  const data = await latchFetch('/recovery/blob', { method: 'GET' }, recoveryToken);

  const encryptedBlob = data.encrypted_blob as EncryptedBackup;

  let plaintext: string;
  try {
    plaintext = decryptBackup(encryptedBlob, password);
  } catch {
    throw new Error('Incorrect recovery password');
  }

  const blob = JSON.parse(plaintext) as Record<string, string>;

  const writes: Promise<void>[] = [];

  if (blob.passkey_private_key) {
    writes.push(SecureStore.setItemAsync(SECURE_KEYS.PASSKEY_PRIVATE_KEY, blob.passkey_private_key));
  }
  if (blob.credential_id) {
    writes.push(SecureStore.setItemAsync(SECURE_KEYS.CREDENTIAL_ID, blob.credential_id));
  }
  if (blob.key_data_hex) {
    writes.push(SecureStore.setItemAsync(SECURE_KEYS.KEY_DATA_HEX, blob.key_data_hex));
  }
  if (blob.smart_account) {
    writes.push(SecureStore.setItemAsync(SECURE_KEYS.SMART_ACCOUNT, blob.smart_account));
  }
  if (blob.mnemonic) {
    writes.push(SecureStore.setItemAsync(SECURE_KEYS.MNEMONIC, blob.mnemonic));
  }
  if (blob.accounts) {
    writes.push(SecureStore.setItemAsync(SECURE_KEYS.ACCOUNTS, blob.accounts));

    // Restore indexed passkey keys for additional passkey accounts (list index 1+).
    const accounts = JSON.parse(blob.accounts) as WalletAccount[];
    accounts.forEach((account, listIndex) => {
      if (account.index < 0 && listIndex > 0) {
        const keys = getPasskeyStorageKeys(listIndex);
        if (blob[`passkey_private_key_${listIndex}`]) {
          writes.push(SecureStore.setItemAsync(keys.privateKey, blob[`passkey_private_key_${listIndex}`]));
        }
        if (blob[`credential_id_${listIndex}`]) {
          writes.push(SecureStore.setItemAsync(keys.credentialId, blob[`credential_id_${listIndex}`]));
        }
        if (blob[`key_data_hex_${listIndex}`]) {
          writes.push(SecureStore.setItemAsync(keys.keyDataHex, blob[`key_data_hex_${listIndex}`]));
        }
      }
    });
  }

  await Promise.all(writes);
}

// ─── Auth (continued) ─────────────────────────────────────────────────────────

/**
 * Revoke the stored refresh token. Clears tokens from SecureStore.
 * Safe to call even when already logged out.
 */
export async function logout(): Promise<void> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN),
    SecureStore.getItemAsync(SECURE_KEYS.REFRESH_TOKEN),
  ]);

  if (accessToken && refreshToken) {
    await latchFetch(
      '/auth/logout',
      { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) },
      accessToken,
    ).catch(() => {});
  }

  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN),
  ]);
}

// ─── Backup (continued) ───────────────────────────────────────────────────────

/**
 * Returns true if the authenticated user has a stored credential backup.
 */
export async function checkBackupExists(): Promise<boolean> {
  const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  if (!accessToken) return false;
  const data = await latchFetch('/backup', {}, accessToken);
  return data.exists === true;
}

// ─── Market ───────────────────────────────────────────────────────────────────

export interface PriceData {
  price: string;
  change_24h: number;
}

/**
 * Fetch live USD prices for the given Stellar asset symbols.
 * Results are Redis-cached on the backend for 60 seconds.
 */
export async function getPrices(tokens: string[]): Promise<Record<string, PriceData | null>> {
  return latchFetch(`/prices?tokens=${encodeURIComponent(tokens.join(','))}`);
}

// ─── Transaction relay + simulate ────────────────────────────────────────────

export interface SimulateBackendResult {
  min_resource_fee: string;
  transaction_data: string;
  results?: Array<{ auth: string[]; xdr: string }>;
  events?: string[];
  restore_preamble?: { min_resource_fee: string; transaction_data: string };
  latest_ledger: number;
  error?: string;
}

export function simulateTransaction(
  xdr: string,
  network: 'testnet' | 'mainnet',
): Promise<SimulateBackendResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_ROOT}/api/transaction/simulate`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 30000;
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) {
          reject(new Error(body?.error?.message ?? `Simulation failed (${xhr.status})`));
        } else {
          resolve(body.data as SimulateBackendResult);
        }
      } catch {
        reject(new Error(`Simulation failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Simulation timed out'));
    xhr.send(JSON.stringify({ xdr, network }));
  });
}

export interface RelayResult {
  hash?: string;
  status: 'SUCCESS' | 'FAILED' | 'ERROR' | 'PENDING' | 'TRY_AGAIN_LATER';
  error?: string;
}

/**
 * Submit a signed Soroban transaction XDR via the backend relay.
 * The backend polls for up to 20 s and returns the final status.
 * If status is PENDING the caller should continue polling directly.
 */
export function relayTransaction(
  xdr: string,
  network: 'testnet' | 'mainnet',
): Promise<RelayResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_ROOT}/api/transaction/relay`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 45000; // relay polls server-side for up to 20 s
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) {
          reject(new Error(body?.error?.message ?? `Relay failed (${xhr.status})`));
        } else {
          resolve(body.data as RelayResult);
        }
      } catch {
        reject(new Error(`Relay failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Relay request timed out'));
    xhr.send(JSON.stringify({ xdr, network }));
  });
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface HistoryParams {
  gAddress?: string;
  cAddress?: string;
  network?: 'testnet' | 'mainnet';
  limit?: number;
}

export interface HistoryResult {
  transactions: unknown[];
  network: string;
}

/**
 * Fetch transaction history for the given Stellar account addresses.
 * Requires at least one of gAddress or cAddress.
 */
export async function getHistory(params: HistoryParams): Promise<HistoryResult> {
  const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  if (!accessToken) throw new Error('Not authenticated');

  const query = new URLSearchParams();
  if (params.gAddress) query.set('g_address', params.gAddress);
  if (params.cAddress) query.set('c_address', params.cAddress);
  if (params.network) query.set('network', params.network);
  if (params.limit != null) query.set('limit', String(params.limit));

  return latchFetch(`/history?${query}`, {}, accessToken);
}
