# Phase 3 — Wallet-Based Auth + Transaction History Migration

This phase introduces **wallet-signature-based authentication** to wallet-backend
and migrates mobile's transaction-history fetching from direct Horizon/RPC calls
to wallet-backend's GraphQL API. Balance fetching stays on direct Soroban RPC
(hybrid Option C).

Success criteria are stated per step. A step is not done until its verify
condition passes.

---

## Goals

1. Any Latch user — backed up or not — can authenticate to wallet-backend using
   only the keys their wallet already controls (Ed25519 for mnemonic users,
   P-256 / WebAuthn for passkey users).
2. Mobile's `use-stellar-transactions.ts` fetches history from wallet-backend
   GraphQL (paginated, indexed) instead of Horizon `/operations` + Soroban RPC
   parsing.
3. `use-portfolio.ts` (balance) remains on direct Soroban RPC — unchanged.
4. No static secrets embedded in the mobile bundle for auth purposes.
5. Existing email-JWT (backup/recovery) endpoints continue to work unchanged.

---

## Non-Goals

- Migrating balance fetching to wallet-backend (intentional — hybrid Option C).
- Replacing Horizon for classic-only G-address activity (out of scope; passkey
  C-addresses are the priority).
- SEP-10 full conformance. We use a simplified challenge/response that mirrors
  SEP-10's intent but does not require building Stellar transactions as the
  challenge.

---

## Threat Model

| Threat | Mitigation |
|---|---|
| Replay of signed challenge | Nonces are single-use, server-tracked, 60s TTL |
| Stolen JWT used after wallet rotation | Short access TTL (15 min), refresh requires re-signing on rotation past N days |
| Cross-wallet authorization (user A reads user B's history) | GraphQL resolver enforces `sub` (wallet) matches the queried address |
| Public read of any wallet's history | Acceptable — on-chain data is public. Auth here is for rate-limiting and per-wallet scope, not data secrecy. |
| Passkey assertion replay | WebAuthn `clientDataJSON.challenge` is the server's nonce; `signCount` checked when available |
| Server reads bogus public key from contract | Only fetch the P-256 pubkey via Soroban RPC `getLedgerEntries` on the smart account contract's instance storage. The contract storage is the source of truth — same key the contract uses to authorize transactions. |
| Brute force / DoS on `/v1/auth/challenge` | Per-IP rate limit; nonce table size cap |

---

## Architecture

### Auth flow (per session)

```
┌─────────┐                                        ┌────────────────┐
│ Mobile  │                                        │ wallet-backend │
└────┬────┘                                        └───────┬────────┘
     │ POST /v1/auth/challenge                            │
     │   { wallet: "C...", key_type: "passkey"|"ed25519" } │
     │───────────────────────────────────────────────────▶│
     │                                                    │ INSERT nonce
     │   { nonce: "<base64>", expires_in: 60 }            │ (single-use, TTL)
     │◀───────────────────────────────────────────────────│
     │                                                    │
     │ <sign nonce locally>                               │
     │   - Ed25519: stellar-sdk Keypair.sign(nonce)       │
     │   - Passkey: navigator.credentials.get             │
     │     (or react-native-passkey equivalent) with      │
     │     challenge = nonce → WebAuthn assertion         │
     │                                                    │
     │ POST /v1/auth/sign-in                              │
     │   { wallet, nonce, key_type,                       │
     │     signature, // Ed25519 only                     │
     │     authenticator_data, client_data_json,          │
     │     signature_b64 // passkey only                  │
     │   }                                                │
     │───────────────────────────────────────────────────▶│
     │                                                    │ 1. CONSUME nonce (tx-locked)
     │                                                    │ 2. Verify signature:
     │                                                    │    - Ed25519: stellar/keypair
     │                                                    │    - Passkey: fetch contract
     │                                                    │      storage → P-256 pubkey
     │                                                    │      → cose/webauthn verify
     │                                                    │ 3. Issue JWT (scope=wallet,
     │                                                    │    sub=walletAddr, kty=ed25519|passkey)
     │   { access_token, refresh_token, expires_in }      │
     │◀───────────────────────────────────────────────────│
     │                                                    │
     │ POST /graphql/query                                │
     │   Authorization: Bearer <access_token>             │
     │───────────────────────────────────────────────────▶│
     │                                                    │ middleware: validate JWT,
     │                                                    │ inject wallet into ctx,
     │                                                    │ resolver enforces
     │                                                    │ ctx.wallet == query.address
     │   { data: { accountByAddress: {...} } }            │
     │◀───────────────────────────────────────────────────│
```

### JWT shape

Reuses existing HS256 + `LATCH_JWT_SECRET` (no new secret to manage).

```json
{
  "sub":   "CABAC52X...",        // wallet address (G... or C...)
  "scope": "wallet",             // distinguishes from email scope
  "kty":   "passkey",            // or "ed25519"
  "exp":   1234567890,
  "iat":   1234567890
}
```

The existing email-JWT keeps `scope` absent (or sets `"email"`). The
`LatchBearerAuth` middleware already exists; we extend it to read `scope` and
expose the right identity (email user-id vs wallet address) on the context.

---

## Database

### Migration: `2026-05-29.0-latch-auth-nonces.sql`

```sql
-- +migrate Up
CREATE TABLE latch_auth_nonces (
  nonce       VARCHAR(64) PRIMARY KEY,    -- 32 bytes hex
  wallet      VARCHAR(56) NOT NULL,
  key_type    VARCHAR(16) NOT NULL,       -- 'ed25519' | 'passkey'
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_latch_auth_nonces_expires_at ON latch_auth_nonces(expires_at);

-- +migrate Down
DROP INDEX IF EXISTS idx_latch_auth_nonces_expires_at;
DROP TABLE IF EXISTS latch_auth_nonces;
```

No changes to `latch_refresh_tokens` — wallet-scoped refresh tokens reuse the
same table. The `user_id` column becomes nullable so wallet sessions (which
have no email user) can use it. New column `wallet_address VARCHAR(56) NULL`
holds the wallet identity for wallet-scoped refreshes.

### Migration: `2026-05-29.1-refresh-tokens-wallet-scope.sql`

```sql
-- +migrate Up
ALTER TABLE latch_refresh_tokens ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE latch_refresh_tokens ADD COLUMN wallet_address VARCHAR(56);
ALTER TABLE latch_refresh_tokens
  ADD CONSTRAINT refresh_tokens_owner_check
  CHECK ((user_id IS NOT NULL) OR (wallet_address IS NOT NULL));
CREATE INDEX idx_latch_refresh_tokens_wallet ON latch_refresh_tokens(wallet_address)
  WHERE wallet_address IS NOT NULL;

-- +migrate Down
DROP INDEX IF EXISTS idx_latch_refresh_tokens_wallet;
ALTER TABLE latch_refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_owner_check;
ALTER TABLE latch_refresh_tokens DROP COLUMN IF EXISTS wallet_address;
ALTER TABLE latch_refresh_tokens ALTER COLUMN user_id SET NOT NULL;
```

---

## Backend work (wallet-backend repo)

All paths relative to `references/wallet-backend/`.

---

### Step 3.1 — Add nonce service

**Files:** `internal/services/latch/nonce.go` (new)

Service responsibilities:
- `Issue(ctx, wallet, keyType) (nonce string, ttl time.Duration, err error)`
  - Generates 32 random bytes → hex
  - Inserts into `latch_auth_nonces` with `expires_at = NOW() + 60s`
  - Returns the raw nonce
- `Consume(ctx, nonce, wallet, keyType) error`
  - `UPDATE ... SET consumed_at = NOW() WHERE nonce = $1 AND wallet = $2
     AND key_type = $3 AND consumed_at IS NULL AND expires_at > NOW()
     RETURNING 1`
  - If no row returned → `ErrInvalidNonce`
  - Single-row atomic update prevents double-spend

Sentinels: `ErrInvalidNonce`, `ErrNonceExpired`.

**Verify:** Unit tests for issue+consume happy path, double-consume, expired,
wrong wallet.

---

### Step 3.2 — Add wallet signature verification

**Files:** `internal/services/latch/walletsig.go` (new)

Two verifier paths, dispatched by `key_type`:

#### Ed25519 path
```go
func VerifyEd25519(walletGAddress string, nonce []byte, signature []byte) error
```
- Decode G-address via `strkey.Decode(VersionByteAccountID, walletGAddress)`
- `ed25519.Verify(pubkey, nonce, signature)`
- Errors: `ErrBadSignature`, `ErrBadWalletAddress`

#### Passkey (P-256 / WebAuthn) path
```go
func VerifyPasskey(
    ctx context.Context,
    rpcClient *SorobanRPC,
    walletCAddress string,
    nonceB64 string,
    authenticatorData []byte,
    clientDataJSON []byte,
    signature []byte,
) error
```
- Fetch the smart account's instance storage via `getLedgerEntries` to extract
  the P-256 public key the contract uses for transaction auth. Storage layout
  is determined by the smart account contract code (latch-mobile's
  `src/api/passkey.ts` writes it during deploy; document the key layout in the
  passkey contract source).
- Verify the WebAuthn assertion:
  - Parse `clientDataJSON` → check `type == "webauthn.get"`, `challenge ==
    base64url(nonce)`, `origin` is whitelisted (the bundle ID / app URL we
    register at signing time).
  - Compute `signedData = authenticatorData || sha256(clientDataJSON)`.
  - ECDSA verify with the P-256 public key (use `crypto/ecdsa` + `crypto/sha256`).
  - Verify `flags & 0x01` (user-present bit) is set in `authenticatorData`.
- Errors: `ErrBadSignature`, `ErrPubKeyNotFound`, `ErrChallengeMismatch`,
  `ErrOriginMismatch`.

**Dependencies already in go.mod:**
- `crypto/ed25519` — stdlib
- `crypto/ecdsa`, `crypto/elliptic`, `crypto/sha256` — stdlib
- `stellar/go-stellar-sdk/strkey` — already present

No new deps required.

**Verify:** Unit tests:
- Ed25519: valid signature → ok; tampered signature → error; wrong wallet → error
- Passkey: valid assertion → ok; wrong origin → error; wrong challenge → error;
  tampered authData → error

---

### Step 3.3 — Soroban RPC helper for fetching smart-account public key

**Files:** `internal/services/latch/sorobanrpc.go` (new)

Minimal JSON-RPC client over the configured `RPC_URL`:
- `GetContractInstance(ctx, contractID string) (xdr.ScVal, error)`
  - Builds `LedgerKey.contractData(contract, ScvLedgerKeyContractInstance, persistent)`
  - Calls `getLedgerEntries` with base64-encoded key
  - Decodes `LedgerEntryData` → `ContractData().Val()`
- `GetPasskeyPubKey(ctx, contractID string) (ecdsaPubKey, error)`
  - Wrapper that pulls the public-key field from the contract storage's
    instance ScMap by the known symbol (`signers` map; key extraction matches
    the smart-account contract's storage layout)

This is where coordination with the smart-account contract owner is required —
the storage layout must be stable and documented. We need to inspect the latch
passkey contract source (or one of the mobile project's existing deployments)
to lock the exact storage key/path.

**Verify:** Integration test against a real testnet smart account deployed by
latch-mobile — call `GetPasskeyPubKey`, get back a P-256 point, manually verify
it matches what `src/api/passkey.ts` registered.

---

### Step 3.4 — Wallet auth handler

**Files:** `internal/serve/httphandler/latch_wallet_auth.go` (new)

Two endpoints:

#### `POST /v1/auth/challenge`
Request:
```json
{ "wallet": "C... or G...", "key_type": "passkey" | "ed25519" }
```
Response:
```json
{ "data": { "nonce": "<base64url>", "expires_in": 60 } }
```
- Validates `wallet` is a parseable strkey of the right kind for `key_type`
- Calls `NonceSvc.Issue(...)`
- Returns base64url-encoded nonce (so it can be a WebAuthn challenge directly)

#### `POST /v1/auth/sign-in`
Request (Ed25519):
```json
{ "wallet": "G...", "key_type": "ed25519", "nonce": "<base64url>",
  "signature": "<base64>" }
```
Request (Passkey):
```json
{ "wallet": "C...", "key_type": "passkey", "nonce": "<base64url>",
  "authenticator_data": "<base64>",
  "client_data_json": "<base64>",
  "signature": "<base64>" }
```
Response:
```json
{ "data": { "access_token": "...", "refresh_token": "...", "expires_in": 900 } }
```
- Consume nonce atomically (`NonceSvc.Consume`)
- Verify signature via `walletsig.VerifyEd25519` or `walletsig.VerifyPasskey`
- Mint access JWT with `sub=wallet, scope=wallet, kty=<key_type>`
- Mint refresh token with `wallet_address` populated

**Verify:** End-to-end flow with a known testnet keypair returns valid tokens.

---

### Step 3.5 — Extend `LatchBearerAuth` middleware to recognize wallet-scoped JWTs

**Files:** `internal/serve/middleware/latch_auth_middleware.go` (modify)

Current middleware validates `sub` and injects it as user ID. Extend it to:
- Read `scope` claim
- If `scope == "wallet"`: inject `walletAddress` on context (new key)
- If `scope` absent or `"email"`: existing behavior

Add context accessor:
```go
func LatchWalletFromContext(ctx context.Context) string
```

Backwards compatible — existing handlers that call `LatchUserIDFromContext`
continue to work for email scope. Wallet handlers use the new accessor.

**Verify:** Unit tests cover all three cases (no scope, email scope, wallet
scope).

---

### Step 3.6 — Add GraphQL auth middleware that accepts either signed-request OR wallet JWT

**Files:** `internal/serve/serve.go` (modify), new
`internal/serve/middleware/graphql_dual_auth.go` (new)

The current `AuthenticationMiddleware` (SEP-style signed HTTP requests) gates
GraphQL. Add a new middleware that:
1. If `Authorization: Bearer <token>` is present AND token is a valid Latch
   wallet-scoped JWT → inject `walletAddress` on context, allow
2. Else fall through to the existing SEP-style auth (which still works for
   internal/admin clients)

Apply this on the GraphQL group in `handler()`. Effectively:
```go
mux.Group(func(r chi.Router) {
    r.Use(middleware.GraphQLDualAuth(
        latchJWTSecret,            // for Latch wallet JWTs
        deps.RequestAuthVerifier,  // for SEP-style signed requests
    ))
    r.Route("/graphql", ...)
})
```

**Verify:** Manual curl tests — Latch wallet JWT works; signed request also
works; unauthenticated returns 401.

---

### Step 3.7 — GraphQL resolver authorization

**Files:** `internal/serve/graphql/resolvers/*.go` (modify the account resolvers)

In each resolver that takes an `address` argument:
```go
walletCtx := middleware.LatchWalletFromContext(ctx)
if walletCtx != "" && walletCtx != address {
    return nil, fmt.Errorf("forbidden: token does not authorize queries for %s", address)
}
```

Skip the check if `walletCtx == ""` (request came in via SEP signed auth which
already gates access at a different layer).

**Verify:** Manual test — try to query a wallet not matching your JWT `sub` →
GraphQL error returned.

---

### Step 3.8 — Wire services into `Configs`, `handlerDeps`, and route registration

**Files:** `internal/serve/serve.go` (modify)

- Add `LatchNonceSvc *latch.NonceService` to `handlerDeps`
- Add `LatchWalletAuthSvc *latch.WalletAuthService` (wrapper around auth + sig +
  nonce) — optional convenience
- Register routes:
  ```go
  r.Post("/auth/challenge", latchWalletAuthHandler.Challenge)
  r.Post("/auth/sign-in", latchWalletAuthHandler.SignIn)
  ```

**Verify:** `go build ./...` clean; `--help` lists the new flags if any
(none needed — reuses `LATCH_JWT_SECRET`).

---

## Mobile work (latch-mobile repo)

All paths relative to repo root.

---

### Step 3.9 — Add a wallet-backend GraphQL client module

**Files:** `src/api/wallet-backend.ts` (new)

Responsibilities:
- Single `gqlFetch<T>(query, variables, accessToken)` helper (XHR-backed —
  same Android-TLS workaround pattern as `latchFetch`)
- Exported typed query functions:
  - `fetchAccountTransactions(walletAddress, first, after)`
  - `fetchAccountOperations(walletAddress, first, after)`
  - `fetchAccountStateChanges(walletAddress, first, after)`

No GraphQL library — handwritten query strings. Keeps the bundle small and the
network layer consistent with the existing `latchFetch` pattern.

**Verify:** Type checks, lint passes. Manual: response shape matches the
expected `TransactionConnection` from the schema.

---

### Step 3.10 — Wallet sign-in module

**Files:** `src/lib/wallet-auth.ts` (new)

```ts
export async function signInWithWallet(
  account: WalletAccount
): Promise<{ accessToken: string; refreshToken: string }>;

export async function ensureWalletSession(
  account: WalletAccount
): Promise<string>; // returns access token, refreshing if needed
```

`signInWithWallet`:
1. POST `/v1/auth/challenge` with `{ wallet, key_type }`
2. Sign the nonce:
   - Mnemonic users: `stellar-sdk.Keypair.fromSecret(secret).sign(nonce)`
   - Passkey users: use `react-native-passkey` or the existing
     `src/lib/passkey-webauthn.ts` to produce a WebAuthn assertion with the
     server's nonce as the challenge
3. POST `/v1/auth/sign-in` with the appropriate payload
4. Persist `accessToken` and `refreshToken` in SecureStore under new keys:
   - `SECURE_KEYS.WALLET_ACCESS_TOKEN`
   - `SECURE_KEYS.WALLET_REFRESH_TOKEN`

`ensureWalletSession`:
- If a non-expired access token exists, return it
- If only a refresh token exists, hit `/v1/auth/refresh` (existing endpoint
  already handles refresh for both scopes after Step 3.4)
- Otherwise call `signInWithWallet`

**Verify:** Unit/integration: simulated mnemonic user signs in successfully;
simulated passkey user signs in (Face ID prompt expected on first sign-in,
suppressed on subsequent in-session calls if the OS caches the assertion).

---

### Step 3.11 — Migrate `use-stellar-transactions.ts` to wallet-backend

**Files:** `src/hooks/use-stellar-transactions.ts` (modify)

Replace the direct Horizon/Soroban-RPC fetching with:
```ts
const accessToken = await ensureWalletSession(activeAccount);
const conn = await fetchAccountTransactions(activeAccount.address, 25, cursor);
return mapTxnConnectionToStellarPayments(conn);
```

Keep the existing semantic-type derivation (`send` / `receive` / `swap` /
`bridge` / `unknown`) but apply it to wallet-backend's already-parsed structures
instead of raw XDR.

Delete the now-dead Horizon helpers (`horizonGet`, `sorobanRpc` within this
file, XDR parsing helpers). Leave `BUNDLER_G_ADDRESS` — it's still used by
classification logic for self-paid Soroban fees.

**Verify:** `bun run lint` passes. Manually exercise the history screen
against the running wallet-backend with a known account and confirm the data
matches what direct Horizon returned before.

---

### Step 3.12 — Leave `use-portfolio.ts` (balance) untouched

No changes — keeps direct Soroban RPC for balances. Document the split in code
comments at the top of `use-portfolio.ts` and `use-stellar-transactions.ts`:
> Balance lives on direct Soroban RPC for latency. History lives on
> wallet-backend GraphQL for pagination and indexed-search. See
> `docs/phase-3-wallet-auth-and-history.md`.

(One short comment is appropriate here — the divergence between the two hooks
is non-obvious to future readers and the existing pattern is to put the WHY at
the top of the file.)

**Verify:** N/A; verification is the absence of changes.

---

### Step 3.13 — Add SECURE_KEYS entries for wallet session tokens

**Files:** `src/store/wallet.ts` (modify)

Add to `SECURE_KEYS`:
```ts
WALLET_ACCESS_TOKEN:  'wallet_access_token',
WALLET_REFRESH_TOKEN: 'wallet_refresh_token',
```

Ensure the existing `clearAll()` purges these as well.

**Verify:** Grep confirms both new keys are wiped on logout.

---

## Coexistence with email-JWT auth

The existing `/v1/auth/register`, `/v1/auth/verify`, `/v1/auth/logout`,
`/v1/auth/refresh`, `/v1/backup/*`, `/v1/recovery/*` flows are unchanged.

Two independent token namespaces:
- **Email-scope JWT** (`scope` absent or `"email"`): authorizes
  backup/recovery; `sub` = `latch_users.id`
- **Wallet-scope JWT** (`scope: "wallet"`): authorizes GraphQL queries for that
  wallet; `sub` = wallet address

A single user may hold both at the same time and that is fine; they live under
different SecureStore keys and serve different APIs.

---

## Rollout

1. **Backend**: Deploy Step 3.1–3.8 behind a feature flag —
   `LATCH_WALLET_AUTH_ENABLED` (boolean, default false). When false,
   `/v1/auth/challenge` and `/v1/auth/sign-in` return 404; GraphQL dual-auth
   falls back to signed-request only.
2. **Backend canary**: Flip the flag on staging, run integration tests, hit
   GraphQL with a wallet JWT.
3. **Mobile**: Land 3.9–3.13 behind a Constants flag —
   `ENABLE_WALLET_BACKEND_HISTORY` (default false in main; true in staging
   builds). The hook keeps a fallback to the old code path when disabled.
4. **Production rollout**: Flip the backend flag, then bump the mobile flag in
   the next OTA via hot-updater.
5. **Decommission**: After two release cycles with no regressions, delete the
   fallback code path and the flag from mobile.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Passkey storage layout drifts in the smart account contract | Low | High | Lock the storage path before Step 3.3; add a contract-version assertion in `GetPasskeyPubKey` |
| WebAuthn implementation differs across iOS/Android | Medium | Medium | Use react-native-passkey which abstracts the platform layer; add integration tests on both platforms |
| Ingest not synced in prod when mobile starts using GraphQL | High | High | Block the mobile feature flag rollout until ingest is at network tip; expose a `/health` field showing lag |
| GraphQL query rate from many mobile clients overwhelms wallet-backend | Medium | Medium | Add per-JWT rate limit middleware; cache `accountTransactions` queries in-memory for short TTLs |
| User loses access if their device's passkey is reset | Low | High | Already addressed by Latch's existing recovery flow (email + recovery blob); wallet auth re-derives via the same recovery path |
| Refresh token theft | Low | High | Already addressed by single-use rotation in `RotateRefreshToken` |

---

## Open questions

1. **Smart account contract storage layout for passkey public keys** — need to
   read the contract source (or pull the data from a known deployment) to lock
   the exact ScMap key path. Action: confirm before Step 3.3 begins.
2. **WebAuthn origin allowlist** — what string does the React Native passkey
   library set as `origin` in `clientDataJSON`? It's typically the bundle ID;
   needs verification on both iOS and Android. Action: prototype in Step 3.10.
3. **Should the wallet JWT also authorize backup endpoints for the same
   wallet's user?** — Current design says no (those endpoints are email-scoped
   on purpose). If product wants a one-token-fits-all UX, revisit after Phase
   3 ships.
4. **History for mnemonic (G-address) users** — `accountByAddress(G...)`
   should already return data once ingest covers classic operations. Confirm
   wallet-backend's resolvers don't artificially restrict to C-addresses.

---

## Estimate

| Workstream | Effort |
|---|---|
| Backend: nonces, signature verifiers, handlers, middleware (3.1–3.8) | 2–3 days |
| Backend: tests (unit + integration with running ingest) | 1 day |
| Mobile: GraphQL client + sign-in module (3.9–3.10) | 1 day |
| Mobile: history hook migration + secure-store wiring (3.11–3.13) | 1 day |
| End-to-end testing on both platforms | 1 day |
| **Total** | **~5–7 working days** |

---

## Verify (top-level success criteria)

A skip-backup mnemonic user opens the history screen on a fresh install:
1. Mobile calls `ensureWalletSession` → `/v1/auth/challenge` →
   `/v1/auth/sign-in` succeeds with no user interaction
2. Mobile receives a wallet-scope JWT
3. GraphQL query returns the user's transactions
4. Database shows: zero rows in `latch_users` (user never registered an
   email), one new row in `latch_refresh_tokens` with `wallet_address`
   populated and `user_id` NULL

A passkey user does the same:
1. `signInWithWallet` triggers a Face ID prompt (the WebAuthn assertion)
2. Subsequent in-session GraphQL queries use the cached access token; no
   further biometric prompts
3. Database shows the same row pattern as above

The existing backup flow is unchanged for users who do register email.
