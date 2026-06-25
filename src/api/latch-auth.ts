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

const API_ROOT = process.env.EXPO_PUBLIC_WALLET_BACKEND_URL ?? '';
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

// Error thrown by latchFetch for any 4xx/5xx. Carries the HTTP status and the
// server-provided error code so callers can branch on specific failures (e.g.
// 409 ADDRESS_MISMATCH for the "email linked to another wallet" case) without
// resorting to message string matching.
export class LatchAPIError extends Error {
  status: number;
  code?: string;
  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.name = 'LatchAPIError';
    this.status = status;
    this.code = code;
  }
}

// latchFetch wraps xhrRaw with a single 401 → refresh → retry cycle.
// On a 401, it calls silentRefresh and retries once with the new token.
// All other 4xx/5xx statuses throw LatchAPIError carrying the status + code.
async function latchFetch(path: string, options: RequestInit = {}, token?: string): Promise<any> {
  let { status, body } = await xhrRaw(path, options, token);

  if (status === 401 && token) {
    const newToken = await silentRefresh();
    if (newToken) {
      ({ status, body } = await xhrRaw(path, options, newToken));
    }
  }

  if (status >= 400) {
    throw new LatchAPIError(
      status,
      body?.error?.code,
      body?.error?.message ?? `Request failed (${status})`,
    );
  }
  return body?.data;
}

/**
 * Clear the email-scope session from SecureStore. Used when we discover the
 * email the user authenticated against is anchored to a different wallet:
 * leaving the tokens behind would mean the device is "logged in" to an
 * identity it can't actually back up against.
 */
export async function clearEmailSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(SECURE_KEYS.USER_EMAIL),
  ]);
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
 * Pre-OTP check: does this email already anchor a stored wallet backup? Used
 * at registration time so the user can be prompted with "this email is tied
 * to another wallet" before an OTP is sent. Returns false on network errors
 * to fail open — the post-OTP check in collect-email and the 409 from upload
 * still catch any collision we miss here.
 */
export async function checkEmailHasBackup(email: string): Promise<boolean> {
  try {
    const data = await latchFetch(
      `/auth/email-status?email=${encodeURIComponent(email)}`,
      { method: 'GET' },
    );
    return data?.has_backup === true;
  } catch {
    return false;
  }
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

  // The backend tracks recovery against a single wallet per user. With multi-
  // account support, SECURE_KEYS.SMART_ACCOUNT follows the *active* account, so
  // we resolve the index-0 (primary) account explicitly and register that one.
  let primarySmartAccount: string | null = null;
  if (accountsJson) {
    try {
      const parsed = JSON.parse(accountsJson) as WalletAccount[];
      primarySmartAccount = parsed[0]?.smartAccountAddress ?? null;
    } catch {
      // fall through — primarySmartAccount stays null
    }
  }
  const registeredSmartAccount = primarySmartAccount ?? smartAccount ?? '';

  const blob: Record<string, string> = { version: '2' };
  if (passkeyPrivateKey) blob.passkey_private_key = passkeyPrivateKey;
  if (credentialId) blob.credential_id = credentialId;
  if (keyDataHex) blob.key_data_hex = keyDataHex;
  if (registeredSmartAccount) blob.smart_account = registeredSmartAccount;
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
      body: JSON.stringify({
        encrypted_blob: encryptedBlob,
        smart_account_address: registeredSmartAccount,
      }),
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
    writes.push(
      SecureStore.setItemAsync(SECURE_KEYS.PASSKEY_PRIVATE_KEY, blob.passkey_private_key),
    );
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
          writes.push(
            SecureStore.setItemAsync(keys.privateKey, blob[`passkey_private_key_${listIndex}`]),
          );
        }
        if (blob[`credential_id_${listIndex}`]) {
          writes.push(
            SecureStore.setItemAsync(keys.credentialId, blob[`credential_id_${listIndex}`]),
          );
        }
        if (blob[`key_data_hex_${listIndex}`]) {
          writes.push(SecureStore.setItemAsync(keys.keyDataHex, blob[`key_data_hex_${listIndex}`]));
        }
      }
    });
  }

  await Promise.all(writes);
}

// ─── Backup (continued) ───────────────────────────────────────────────────────

export interface BackupStatus {
  exists: boolean;
  /** Wallet address the existing backup is bound to. Empty when !exists. */
  smartAccountAddress: string;
}

/**
 * Returns the authenticated user's backup status: whether one exists, and
 * which wallet address it's bound to. The address lets callers detect that
 * the email is already anchored to a different wallet and prompt for a
 * different email before attempting to upload.
 */
export async function getBackupStatus(): Promise<BackupStatus> {
  const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  if (!accessToken) return { exists: false, smartAccountAddress: '' };
  const data = await latchFetch('/backup', {}, accessToken);
  return {
    exists: data?.exists === true,
    smartAccountAddress: data?.smart_account_address ?? '',
  };
}

/**
 * Returns true if the authenticated user has a stored credential backup.
 */
export async function checkBackupExists(): Promise<boolean> {
  const status = await getBackupStatus();
  return status.exists;
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

// ─── Deposit ─────────────────────────────────────────────────────────────────

export interface DepositInfo {
  pool_address: string;
  memo: string;
}

export interface DepositJob {
  id: number;
  stellar_op_id: string;
  amount_stroops: number;
  status: string;
  error?: string;
  created_at: string;
  processed_at?: string;
}

export async function fetchDepositInfo(): Promise<DepositInfo> {
  const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  if (!accessToken) throw new Error('Not authenticated');
  return latchFetch('/deposit', {}, accessToken);
}

export async function fetchDepositStatus(): Promise<{ jobs: DepositJob[] }> {
  const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  if (!accessToken) return { jobs: [] };
  return latchFetch('/deposit/status', {}, accessToken);
}
