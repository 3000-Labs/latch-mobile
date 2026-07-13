# Wallet Backend Migration

Analysis of what mobile currently depends on from `latch-api`, what is dead, and
what moves into `wallet-backend`. Based on a full read of every touched file —
not a grep scan.

---

## Confirmed live dependencies on latch-api

These are the only functions in `src/api/latch-auth.ts` that are actually imported
and called from a screen or component. Everything else is dead code.

| Function | Endpoint | Called from |
|---|---|---|
| `registerEmail` | `POST /v1/auth/register` | `collect-email.tsx` |
| `verifyOTP` | `POST /v1/auth/verify` | `collect-email.tsx` |
| `saveAuthTokens` | local SecureStore write — no network call | `collect-email.tsx` |
| `silentRefresh` | `POST /v1/auth/refresh` | internally inside `latchFetch` |
| `initiateRecovery` | `POST /v1/recovery/initiate` | `collect-email.tsx` |
| `verifyRecoveryOTP` | `POST /v1/recovery/verify` | `collect-email.tsx` |
| `fetchAndRestoreBackup` | `GET /v1/recovery/blob` | `set-recovery-password.tsx` |
| `uploadBackup` | `POST /v1/backup` | `deploy-account.tsx`, `BackupSheet.tsx` |
| `checkBackupExists` | `GET /v1/backup` | `BackupSheet.tsx` |
| `getPrices` | `GET /v1/prices` | `use-prices.ts` → `index.tsx`, `send-token.tsx` |

---

## Dead code in latch-auth.ts

These functions exist in `latch-auth.ts` but are never imported by any screen,
component, or hook outside the file itself.

| Function | Endpoint | Why dead |
|---|---|---|
| `logout` | `POST /v1/auth/logout` | `profile.tsx` calls `clearAll()` from the Zustand store — never calls this |
| `getHistory` | `GET /v1/history` | Mobile fetches history directly from Horizon + Soroban RPC via `use-stellar-transactions.ts` |
| `simulateTransaction` | `POST /api/transaction/simulate` | Defined but never imported outside `latch-auth.ts` |
| `relayTransaction` | `POST /api/transaction/relay` | Same |

---

## Dead modules

Two entire files are unreachable from any screen or component:

**`src/api/transaction.ts`** — calls `LATCH_BACKEND_URL/api/transaction/build` and
`/api/transaction/submit` on the reference Next.js backend (not latch-api). These
are a prototype counter-contract demo. No screen imports this file.

**`src/hooks/use-smart-account-transaction.ts`** — wraps `transaction.ts`. No screen
or component imports it.

`LATCH_BACKEND_URL` in `src/constants/config.ts` is exported only for `transaction.ts`.
Once that file is deleted, the export and its `EXPO_PUBLIC_API_BASE_URL` alias in `config.ts`
serve no purpose (the same env var is read directly in `latch-auth.ts` as `API_ROOT`).

---

## What never goes through latch-api

These are direct Soroban/Horizon calls that bypass latch-api entirely and must stay
that way — they involve client-side signing or Android XHR transport requirements.

| Module | What it calls | Why it stays direct |
|---|---|---|
| `use-portfolio.ts` | Soroban `getLedgerEntries` | SAC balance reads; wallet-backend GraphQL is a future option pending auth design |
| `use-stellar-transactions.ts` | Horizon ops + Soroban SAC events | Same |
| `smart-account.ts` | `simulateTransaction`, `sendTransaction`, `getLedgerEntries` | Factory deployment; bundler secret is client-side on testnet |
| `passkey.ts` | `simulateTransaction`, `sendTransaction` | Same |
| `migration-tx.ts` | `simulateTransaction`, `sendTransaction` | G-address → C-address sweep; signed by user's Ed25519 keypair |
| `send-token.ts` | `simulateTransaction`, `sendTransaction` | Auth entries signed client-side — cannot be delegated to backend |
| `token-list.ts` | Axios to stellar.expert / lobstr / soroswap | External registries; no latch-api dependency |

All Soroban RPC calls in the above use `sorobanCall()` from `smart-account.ts` (XHR,
not Axios) per the Android TLS requirement documented in `LATCH_REFERENCE.md §2`.

---

## Backup/recovery contract (confirmed from code)

The LATCH_REFERENCE.md §10 contains two inaccuracies compared to the actual code:

**Encryption model:** The reference says "the mobile sends plaintext; encryption happens
on the server." This is wrong. The current implementation in `uploadBackup()` encrypts
the blob client-side with Argon2id + AES-256-GCM via `src/lib/backup-crypto.ts` before
the payload ever leaves the device. The backend stores and returns an opaque ciphertext
it cannot decrypt.

**Backup request shape:** The reference shows `{ blob: CredentialBlob }`. The actual
request body sent by mobile is `{ encrypted_blob: EncryptedBackup, smart_account_address: string }`.
`EncryptedBackup` is a structured object: `{ version, salt, iv, auth_tag, ciphertext }`.
This matches the `storeBackupRequest` struct in `reference/latch-api/internal/handler/backup.go`.

**Recovery response shape:** The reference shows `{"data":{"blob":{...}}}`. The actual
response from `/v1/recovery/blob` is `{"data":{"encrypted_blob":{...}}}`, which the
mobile reads as `data.encrypted_blob` and decrypts locally in `fetchAndRestoreBackup`.

---

## Response envelope

All latch-api responses use `{"data": ...}` for success and `{"error": {"code","message"}}`
for failures. Mobile's `latchFetch` already handles this — it unwraps `body?.data`
before returning to callers (line 81 of `latch-auth.ts`). `silentRefresh` correctly
reads `body.data.access_token` because it calls `xhrRaw` directly. No envelope
mismatch exists in the current code.

---

## Env var state

| Variable | Declared in env.js | Used in | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | ✅ | `latch-auth.ts` (as `API_ROOT`), `config.ts` (as `LATCH_BACKEND_URL`) | `LATCH_BACKEND_URL` usage is dead once `transaction.ts` is removed |
| `EXPO_PUBLIC_SOROBAN_RPC_URL` | via `EXPO_PUBLIC_RPC_URL` | `config.ts`, `smart-account.ts`, `passkey.ts` | Live |
| `EXPO_PUBLIC_FACTORY_ADDRESS` | ✅ | `smart-account.ts`, `passkey.ts`, `send-token.ts` | Live |
| `EXPO_PUBLIC_BUNDLER_SECRET` | ✅ | `smart-account.ts`, `passkey.ts`, `send-token.ts` | Must move server-side before mainnet |
| `EXPO_PUBLIC_VERIFIER_ADDRESS` | ✅ | `config.ts` | Live (Ed25519 verifier) |

---

## Migration target: wallet-backend

The following latch-api route groups must be ported into wallet-backend as a Latch-specific
handler group. The URL paths and request/response shapes are intentionally preserved so
mobile needs zero changes beyond pointing `EXPO_PUBLIC_API_BASE_URL` at the new host.

| Group | Endpoints |
|---|---|
| Auth | `POST /v1/auth/register`, `/v1/auth/verify`, `/v1/auth/refresh`, `/v1/auth/logout` |
| Backup | `POST /v1/backup`, `PUT /v1/backup`, `GET /v1/backup` |
| Recovery | `POST /v1/recovery/initiate`, `/v1/recovery/verify`, `GET /v1/recovery/blob` |
| Prices | `GET /v1/prices` |

Dependencies each group needs from latch-api:
- Auth: `users` table, `refresh_tokens` table, OTP store (Redis), email service, JWT signing
- Backup: `backups` table, `users` FK
- Recovery: OTP store (Redis, `recovery:email` namespace), JWT with `scope: "recovery"`, `backups` table read
- Prices: Redis cache, CoinGecko or equivalent price feed

**wallet-backend GraphQL for balances and history** is a separate project. The current
direct Soroban/Horizon approach in `use-portfolio.ts` and `use-stellar-transactions.ts`
is correct, Android-safe, and not a blocker for the auth/backup/recovery migration.
The GraphQL integration requires an auth design decision (wallet-backend uses
`ClientAuthPublicKeys` signed requests, not JWT) and should be scoped independently.
