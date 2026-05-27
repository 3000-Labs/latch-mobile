# Wallet Backend Migration Plan

Step-by-step execution plan. Phases 1 and 3 are mobile-only (this repo).
Phase 2 is backend work in the wallet-backend repo.

Success criteria are stated per step — a step is not done until its verify
condition passes.

---

## Phase 1 — Mobile dead code removal

No backend changes needed. This repo only. Safe to merge independently.

**Goal:** Delete everything confirmed dead so the codebase reflects reality.
The live auth/backup/recovery surface is unchanged.

---

### Step 1.1 — Delete dead functions from `latch-auth.ts`

**Files:** `src/api/latch-auth.ts`

Remove the four dead exported functions and their internal helpers:
- `logout` (lines 297–315) — profile uses `clearAll()` from Zustand, never this
- `getHistory` and its `HistoryParams`/`HistoryResult` types (lines 424–452) — bypassed entirely by direct Horizon/RPC calls
- `simulateTransaction` and its `SimulateBackendResult` type (lines 346–382) — never imported outside this file
- `relayTransaction` and its `RelayResult` type (lines 384–421) — same

Leave untouched: `xhrRaw`, `silentRefresh`, `latchFetch`, `registerEmail`, `verifyOTP`,
`saveAuthTokens`, `uploadBackup`, `checkBackupExists`, `initiateRecovery`,
`verifyRecoveryOTP`, `fetchAndRestoreBackup`, `getPrices`.

**Verify:** `bun run lint` passes. `grep -n "logout\|getHistory\|simulateTransaction\|relayTransaction" src/api/latch-auth.ts` returns zero matches.

---

### Step 1.2 — Delete `src/api/transaction.ts`

This file calls the reference Next.js counter demo (`/api/transaction/build`,
`/api/transaction/submit`). No screen or component imports it.

**Files:** `src/api/transaction.ts`

Delete the file entirely.

**Verify:** `bun run lint` passes. Confirm `use-smart-account-transaction.ts` is the
only file that imported from it — it will now have a broken import, which triggers step 1.3.

---

### Step 1.3 — Delete `src/hooks/use-smart-account-transaction.ts`

This hook wraps the deleted `transaction.ts`. No screen or component imports it.

**Files:** `src/hooks/use-smart-account-transaction.ts`

Delete the file entirely.

**Verify:** `bun run lint` passes. `grep -r "use-smart-account-transaction" src/ app/` returns zero matches.

---

### Step 1.4 — Clean up `src/constants/config.ts`

`LATCH_BACKEND_URL` was only exported for `transaction.ts`. With that file gone,
remove the export and its internal alias.

**Files:** `src/constants/config.ts`

- Remove: `const LATCH_BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';`
- Remove: `LATCH_BACKEND_URL` from the exports block

Do not remove `EXPO_PUBLIC_API_BASE_URL` itself — `latch-auth.ts` reads it directly
as `process.env.EXPO_PUBLIC_API_BASE_URL` on its own line 13 and is unaffected.

**Verify:** `bun run lint` passes. `grep -n "LATCH_BACKEND_URL" src/` returns zero matches.

---

### Step 1.5 — Lint final pass

**Verify:** `bun run lint` exits 0 with no errors or warnings on any of the four
touched files. No other files should have changed.

---

## Phase 2 — Backend: port latch-api into wallet-backend

Work is in the `wallet-backend` repo, not this one. Documented here so the mobile
and backend work can be sequenced correctly.

**Goal:** wallet-backend exposes the same 10 endpoints at the same paths with the same
request/response shapes as latch-api. Mobile cutover (Phase 3) requires zero mobile
code changes beyond the env var.

---

### Step 2.1 — Database migrations

Port the latch-api schema into wallet-backend migrations. Required tables:

| Table | Purpose |
|---|---|
| `users` | email, email_verified, created_at |
| `refresh_tokens` | token_hash (SHA-256), user_id FK, expires_at, revoked |
| `backups` | user_id FK, encrypted_blob (JSONB), smart_account_address, updated_at |

OTP storage uses Redis (not Postgres) — key: `otp:{email}`, TTL: 10 min.
Recovery OTP key: `otp:recovery:{email}`.

**Verify:** Migrations run cleanly against a fresh wallet-backend Postgres instance.
All three tables exist with correct constraints.

---

### Step 2.2 — Auth service and handlers

Port from `reference/latch-api/internal/handler/auth.go` and
`reference/latch-api/internal/service/auth_service.go`.

Endpoints to implement:

```
POST /v1/auth/register   — upsert user by email, generate + send OTP; always 200
POST /v1/auth/verify     — verify OTP, mark email verified, return JWT pair
POST /v1/auth/refresh    — rotate refresh token, return new JWT pair
POST /v1/auth/logout     — revoke refresh token (Bearer required)
```

Response envelope for all routes: `{"data": ...}` on success, `{"error": {"code","message"}}` on failure.

Token spec (must match latch-api exactly so mobile's `silentRefresh` keeps working):
- `access_token`: HS256 JWT, `sub = user_id`, TTL 15 min
- `refresh_token`: random 32 bytes, stored as SHA-256 hash, single-use
- `refresh` response body: `{"access_token","refresh_token","expires_in"}`

OTP spec:
- 6 digits, 10-minute TTL, 5-attempt limit, 3 OTP emails per hour per address
- Send via the same email service (SES / Resend / SMTP) wired into wallet-backend

**Verify:**
1. `POST /v1/auth/register` with a real email → OTP arrives in inbox
2. `POST /v1/auth/verify` with correct OTP → response contains `access_token` and `refresh_token`
3. `POST /v1/auth/refresh` with the refresh token → new token pair returned, old refresh token rejected on second use
4. `POST /v1/auth/logout` with Bearer → refresh token revoked; subsequent refresh returns 401

---

### Step 2.3 — Backup service and handlers

Port from `reference/latch-api/internal/handler/backup.go` and
`reference/latch-api/internal/service/backup_service.go`.

Endpoints:

```
POST /v1/backup   Bearer + body → 201
PUT  /v1/backup   Bearer + body → 200  (both upsert — identical behavior)
GET  /v1/backup   Bearer        → {"data":{"exists":true|false}}
```

Request body shape (must match mobile's `uploadBackup()` exactly):

```json
{
  "encrypted_blob": {
    "version": "2",
    "salt": "<base64>",
    "iv": "<base64>",
    "auth_tag": "<base64>",
    "ciphertext": "<base64>"
  },
  "smart_account_address": "C..."
}
```

The backend stores `encrypted_blob` as opaque JSONB. It never decrypts it.
Reject any request where `encrypted_blob` is missing `version`, `salt`, `iv`,
`auth_tag`, or `ciphertext`.

**Verify:**
1. `POST /v1/backup` with a valid encrypted blob → 201, row inserted in `backups`
2. `GET /v1/backup` → `{"data":{"exists":true}}`
3. `PUT /v1/backup` with a new blob → 200, row updated (not duplicated)
4. `GET /v1/backup` for a user with no backup → `{"data":{"exists":false}}`
5. Full onboarding flow completes in the mobile app with wallet-backend as the host

---

### Step 2.4 — Recovery service and handlers

Port from `reference/latch-api/internal/handler/recovery.go`.

Endpoints:

```
POST /v1/recovery/initiate   — send recovery OTP; always 200 (no enumeration)
POST /v1/recovery/verify     — verify OTP, return recovery-scoped JWT
GET  /v1/recovery/blob       Authorization: Bearer <recovery_token>
```

Recovery token spec:
- HS256 JWT with `sub = user_id`, `scope = "recovery"`, TTL 15 min
- Rejected by all non-recovery endpoints
- Validated by `validateRecoveryToken` in the handler (check `scope` claim before
  allowing blob access)

Recovery blob response (must match mobile's `fetchAndRestoreBackup()` exactly):

```json
{"data":{"encrypted_blob":{"version":"2","salt":"...","iv":"...","auth_tag":"...","ciphertext":"..."}}}
```

The backend returns the JSONB `encrypted_blob` column as a structured object, not
a raw string. Mobile decrypts it locally with the user's recovery password.

Rate limit: 3 recovery initiations per 24 hours per email.

**Verify:**
1. `POST /v1/recovery/initiate` for unknown email → 200 with no indication email doesn't exist
2. `POST /v1/recovery/initiate` for known email → OTP arrives in inbox
3. `POST /v1/recovery/verify` with correct OTP → `recovery_token` returned
4. `GET /v1/recovery/blob` with `recovery_token` → encrypted blob returned
5. `GET /v1/recovery/blob` with regular `access_token` → 401 (wrong scope)
6. Full recovery flow completes in the mobile app: email → OTP → password → wallet restored

---

### Step 2.5 — Prices service and handler

Port from `reference/latch-api/internal/handler/prices.go` and
`reference/latch-api/internal/service/prices.go`.

Endpoint:

```
GET /v1/prices?tokens=native,usdc,usdt,eurc,xlm
→ {"data":{"native":{"price":"0.12","change_24h":0.5},"usdc":{...}}}
```

No auth required. Cache results in Redis for 60 seconds.

Mobile calls this as: `getPrices(['native', 'usdc', 'usdt', 'eurc', 'xlm'])`.
`use-prices.ts` normalises `native` → `XLM` client-side, so the key names from
the backend don't need to change.

**Verify:**
1. `GET /v1/prices?tokens=native,usdc` returns a JSON object with price + change_24h per token
2. Second request within 60 s is served from Redis cache (confirm via cache hit log)
3. `usePrices()` hook renders correct USD values on the home screen

---

### Step 2.6 — Integration test: full onboarding + recovery

Run the complete flows against wallet-backend before cutting over any production traffic:

**Onboarding:**
1. Register email → receive OTP
2. Verify OTP → receive `access_token` + `refresh_token`
3. Store tokens via `saveAuthTokens`
4. Complete passkey or mnemonic setup
5. `deploy-account.tsx` deploys smart account (Soroban RPC — unchanged)
6. `uploadBackup()` POSTs encrypted blob → 201

**Recovery:**
1. `initiateRecovery(email)` → OTP in inbox
2. `verifyRecoveryOTP(email, otp)` → `recovery_token`
3. `fetchAndRestoreBackup(recoveryToken, password)` → blob decrypted, keys restored to SecureStore
4. PIN set, app navigates to dashboard

---

## Phase 3 — Mobile URL cutover

Single environment variable change. No code changes.

**Goal:** Mobile points at wallet-backend. All auth/backup/recovery flows work
identically because the URL paths and response shapes are preserved from Phase 2.

---

### Step 3.1 — Update `EXPO_PUBLIC_API_BASE_URL`

In `.env` (or `.env.staging` / `.env.production`):

```
EXPO_PUBLIC_API_BASE_URL=https://<wallet-backend-host>
```

The path prefix `/v1/auth/...`, `/v1/backup`, `/v1/recovery/...`, `/v1/prices`
remains unchanged in wallet-backend. No mobile code changes.

**Verify:**
1. `bun start` → app builds without env validation errors
2. Onboarding flow: register → verify → deploy → backup upload completes
3. Recovery flow: initiate → verify → restore completes
4. Home screen: prices load, portfolio loads, transaction history loads
5. `bun run lint` passes (nothing changed in source)

---

## Phase 4 — wallet-backend GraphQL for balances and history (deferred)

Separate project. Not a blocker for Phases 1–3.

**Prerequisite decision:** wallet-backend uses `ClientAuthPublicKeys` (signed HTTP
requests), not JWT. Mobile would need a mechanism to sign requests — either a
dedicated API key issued after auth, or a relaxed read-only endpoint with JWT
from Phase 2. This auth model must be decided before scoping the GraphQL integration.

**Scope when ready:**
- Replace direct `getLedgerEntries` calls in `use-portfolio.ts` with `accountByAddress` GraphQL query
- Replace direct Horizon ops + SAC events in `use-stellar-transactions.ts` with `transactions` GraphQL query
- Add a lightweight GraphQL client (e.g., `graphql-request` — no heavy Apollo needed)
- Add `EXPO_PUBLIC_WALLET_BACKEND_GRAPHQL_URL` env var

The direct Soroban/Horizon approach currently in those hooks is correct and
Android-safe. Replace only when the GraphQL path is tested end-to-end.

---

## Summary

| Phase | Repo | Effort | Blocks |
|---|---|---|---|
| 1 — Delete mobile dead code | latch-mobile | Small — 4 surgical deletes | Nothing |
| 2 — Port latch-api into wallet-backend | wallet-backend | Medium — Go, DB migrations, email | Phase 3 |
| 3 — Update env var | latch-mobile | Trivial | Phase 2 complete |
| 4 — GraphQL integration | latch-mobile | Large — auth design + hook rewrites | Auth decision |

Phase 1 can merge immediately. Phases 2 and 3 move together once wallet-backend
passes the integration tests in Step 2.6.
