/**
 * latch-auth.ts — Latch backend API for auth, backup, and account recovery.
 *
 * All requests go to EXPO_PUBLIC_LATCH_API_URL/v1/...
 * The backup endpoint sends a plaintext credential blob — the backend encrypts
 * it server-side with AES-256-GCM so the mobile never handles the key.
 */

import * as SecureStore from 'expo-secure-store';
import { SECURE_KEYS } from '../store/wallet';

const API_BASE = `${process.env.EXPO_PUBLIC_LATCH_API_URL ?? ''}/v1`;

async function latchFetch(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }

  return data;
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
 * Upload a credential backup to the Latch backend.
 * Reads all relevant keys from SecureStore and sends them as a plaintext JSON
 * blob over TLS — the backend encrypts before storing.
 */
export async function uploadBackup(): Promise<void> {
  const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  if (!accessToken) throw new Error('Not authenticated — cannot upload backup');

  const [passkeyPrivateKey, credentialId, keyDataHex, smartAccount, mnemonic] =
    await Promise.all([
      SecureStore.getItemAsync(SECURE_KEYS.PASSKEY_PRIVATE_KEY),
      SecureStore.getItemAsync(SECURE_KEYS.CREDENTIAL_ID),
      SecureStore.getItemAsync(SECURE_KEYS.KEY_DATA_HEX),
      SecureStore.getItemAsync(SECURE_KEYS.SMART_ACCOUNT),
      SecureStore.getItemAsync(SECURE_KEYS.MNEMONIC),
    ]);

  const blob: Record<string, string> = { version: '1' };
  if (passkeyPrivateKey) blob.passkey_private_key = passkeyPrivateKey;
  if (credentialId) blob.credential_id = credentialId;
  if (keyDataHex) blob.key_data_hex = keyDataHex;
  if (smartAccount) blob.smart_account = smartAccount;
  if (mnemonic) blob.mnemonic = mnemonic;

  await latchFetch(
    '/backup',
    { method: 'POST', body: JSON.stringify({ blob }) },
    accessToken,
  );
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
 * Fetch the decrypted credential blob and restore all keys to SecureStore.
 * Called after a successful recovery OTP verify.
 */
export async function fetchAndRestoreBackup(recoveryToken: string): Promise<void> {
  const data = await latchFetch('/recovery/blob', { method: 'GET' }, recoveryToken);

  const blob = data.blob as Record<string, string>;

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

  await Promise.all(writes);
}
