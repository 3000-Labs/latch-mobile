# Multisig Smart Account — Build Plan

Split-policy multisig for Latch smart accounts. **1-of-N for normal operations,
⌈N/2⌉-of-N for sensitive (admin) operations.** All signers are the user's own
devices (mobile + future passkeys); pairing happens after the first device is
already provisioned.

> **Status / scope caveat.** This is the *device-pairing* multisig (one user,
> many devices) — a different product surface from the multi-user shared wallets
> (`docs/shared-wallet-activation.md`). It also predates the signer-model
> decision: it assumes **Delegated** signers, but `docs/multisig-contract-analysis.md`
> §7 and the shipped code (`src/lib/multisig-send.ts`) use **External** device-key
> signers. Read this for the split-policy rule design, not for current signer/
> transport implementation truth.

---

## Architecture

### Two context rules per smart account

| Rule | Soroban `ContextRuleType` | Scope (what it gates) | Threshold |
|---|---|---|---|
| `default` | `Default` | Catch-all: payments, swaps, third-party contract calls | **1-of-N** |
| `admin` | `CallContract(<self>)` | Every self-mutation — add/remove signer, change threshold, add/remove rule | **⌈N/2⌉-of-N** |

The admin rule only exists once N ≥ 2. While N = 1 the default rule alone
governs everything (effectively single-sig today).

### Why this works on-chain

All sensitive mutations on `LatchSmartAccount` (see
`reference/latch-contracts/latch-smart-account/src/lib.rs:31`) call
`e.current_contract_address().require_auth()`. That triggers `__check_auth`
with a `CallContract(self)` context, which the OZ rule resolver matches
against the more specific `admin` rule. Payments and other ops match
`Default` and require only one signer.

**The on-chain `__check_auth` is the single source of truth for "is this
device allowed to sign for this account."** The wallet-backend never tries
to enforce that — it only coordinates message passing.

### Contracts: nothing to change

Already on-chain via OZ stellar-accounts. The constructor takes
`Vec<Signer>` + `Map<Address, Val>` policies; `add_context_rule`,
`add_signer`, `remove_signer`, `batch_add_signer`, `set_threshold` are all
exposed and gated by self-auth.

Factory (`reference/latch-contracts/latch-account-factory/.../factory-contract/src/lib.rs:52-181`)
already validates `1 ≤ threshold ≤ signer_count` and installs the
`ThresholdPolicy` when N > 1.

---

## Lifecycle

1. **New wallet (N = 1)** — deploy via factory with `[d1]`, threshold 1. Only
   the default rule exists. No admin rule.
2. **Pair 2nd device** — single tx with two sub-invocations on the smart
   account:
   - `batch_add_signer(default_rule_id, [d2])`
   - `add_context_rule(CallContract(self), "admin", None, [d1, d2], {threshold_policy: 2})`

   Authed by d1 alone — admin rule doesn't exist yet, so the call falls back
   to default (1-of-1).
3. **Steady state (N ≥ 2)** — payments need any 1 device. Adding device 3,
   removing a device, raising threshold → need ⌈N/2⌉ devices to cooperate.

---

## Phase plan

Phases are numbered by where they run: **B**ackend, **P** for client (mobile).
A phase is not done until its verification condition passes.

### Phase B1 — Cosign queue (DONE)

**Repo:** `reference/wallet-backend`
**Status:** Implemented; awaits live integration tests.

Six endpoints behind `latchBearerAuth`, all under `/v1/cosign/requests`:

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/cosign/requests` | Initiator proposes a tx (opaque XDR) |
| GET | `/v1/cosign/requests` | List my pending requests |
| GET | `/v1/cosign/requests/{id}` | Get request + all attached signatures |
| POST | `/v1/cosign/requests/{id}/signatures` | Co-signer attaches partial sig |
| POST | `/v1/cosign/requests/{id}/submission` | Initiator records on-chain tx hash |
| DELETE | `/v1/cosign/requests/{id}` | Initiator cancels (idempotent) |

Tables: `latch_cosign_requests`, `latch_cosign_signatures` (migration
`2026-05-31.0`, updated by `2026-06-01.0` — see Phase A1).

**Verify:** `go vet ./...` passes; integration tests pass against a live
Postgres with `TEST_DATABASE_URL` set.

### Phase A1 — Scope by smart_account_address (DONE)

**Repo:** `reference/wallet-backend`
**Status:** Implemented in migration `2026-06-01.0`; both auth modes
(email-scope and wallet-scope JWTs) now work.

**Why:** B1 originally scoped cosign by `user_id UUID NOT NULL REFERENCES
latch_users(id)`. Users authenticating with a wallet-scope JWT
(`sub=<wallet_address>`, `scope="wallet"`) have no `latch_users` row and
were rejected — excluding everyone who hadn't backed up via email.

**Why principal scoping doesn't fit cosign:**

Wallet-scope JWTs identify *one specific signer key*, not the smart
account. Device A's JWT has `sub=keyA`, device B's JWT has `sub=keyB`.
They're co-signers on the same smart account but authenticate as different
principals. Scoping by JWT `sub` would give each device its own private
queue — the opposite of what cosign needs.

The only identifier shared across all devices on a multisig account is
**the smart account address itself**. So scope must be that.

**Changes:**
- Migration `2026-06-01.0` drops `latch_cosign_requests.user_id` and its
  index; adds `idx_latch_cosign_requests_account` on `smart_account_address`.
- `CosignService` API drops the `userID` parameter from every method;
  `ListRequestsForUser` is renamed to `ListRequestsForAccount`.
- `LatchCosignHandler` no longer reads `LatchUserIDFromContext`. The List
  endpoint requires a `smart_account_address` query parameter. A
  `callerPrincipal` log helper records whichever principal (user or
  wallet) the auth middleware injected, purely for observability.

**Auth model after A1:**
- Any caller with a valid Bearer token (email-scope OR wallet-scope) can
  CRUD cosign requests for any `smart_account_address` they specify.
- Authorization is enforced on-chain by `__check_auth` at submission time,
  not at the API. The backend is a coordination layer, not a guard.

**Privacy caveat (open):** an attacker who knows a smart account address
can poll the request queue and read pending tx XDRs. The address itself
isn't secret (it's on-chain), but the queued transactions are visible
metadata until submitted. Mitigations to consider when this becomes a real
concern:
- Client-side encryption of `unsigned_tx_xdr` and `auth_entry_xdr` using
  a key shared between paired devices. Backend stores ciphertext.
- Per-token rate limit on the list endpoint.

**Verify:** `gofmt -l` clean; `go vet ./...` clean; both `scopeEmail` and
`scopeWallet` test cases pass in `latch_cosign_test.go`.

### Phase P1 — Mobile contract plumbing

**Repo:** `latch-mobile` (this repo)

Pure infrastructure, no UI change yet. Current single-device deploys keep
working unchanged.

1. **Generalize signers/threshold encoding.** `src/api/smart-account.ts:175-181`
   and `src/api/passkey.ts:130-138` currently hardcode `[oneSigner]` +
   `threshold=1`. Lift into a helper that accepts `signers[]` + `threshold`
   and defaults to the current shape.
2. **New: `src/api/account-admin.ts`.** XDR builders for `batch_add_signer`,
   `add_context_rule(CallContract(self), …)`, `add_signer`, `remove_signer`,
   `set_threshold`. Plus `computeMajorityThreshold(n) = Math.ceil(n/2)`.
3. **Extend `src/lib/soroban-auth-payload.ts`.** Add
   `aggregateAuthEntries(entries[])` that merges multiple `AuthPayload`s for
   the same context into one `SorobanAuthorizationEntry`.
4. **Extend `src/store/wallet.ts`.** Track `devices: Device[]` and
   `adminRuleId: number | null` per account; rehydrate from SecureStore on
   launch.

**Verify:** `bun run lint` passes; existing single-device wallet creation +
sign-in flows still work end-to-end on testnet.

### Phase P2 — Pairing (UI + cosign client)

**Repo:** `latch-mobile`

Two pairing modes, user picks per session:

- **QR mode (P2P, trustless escape hatch):** device A shows QR with
  `{accountAddress, publicKey_A, ephemeralChallenge}`. B installs, scans,
  derives its key, signs the challenge, shows return QR. A scans, builds
  the dual-op tx (`batch_add_signer` + `add_context_rule`), signs as d1,
  submits. No backend involvement.
- **Link-code mode (backend-mediated):** A POSTs to a new
  `/v1/pair-codes` endpoint (Phase B2 below), gets a 6-digit code. B
  authenticates and POSTs its response to the same code. A polls.

P2 also wires the cosign client:
- `src/api/cosign.ts` — POST/GET/PATCH/DELETE wrappers for Phase B1 endpoints
- New `app/(tabs)/settings/devices.tsx` — device list + add/remove
- New `app/pending-approval.tsx` — when device B opens app and has pending
  admin tx to co-sign, show it for approval

**Verify:** end-to-end testnet pairing works in both modes; admin op
(adding a 3rd device) requires explicit approval on a second device before
landing on-chain.

### Phase B2 — Pair-code endpoints

**Repo:** `reference/wallet-backend`

Three endpoints; pair codes are 6 digits, ≤10 minute TTL, single-use.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/v1/pair-codes` | Bearer | Initiator creates a code, posts its pubkey + smart account address |
| GET | `/v1/pair-codes/{code}` | Bearer | Joiner reads the metadata (pubkey, account) |
| POST | `/v1/pair-codes/{code}/response` | Bearer | Joiner posts back its pubkey + signed challenge |
| GET | `/v1/pair-codes/{code}/response` | Bearer | Initiator polls for the response |

New table `latch_pair_codes`: `code`, `smart_account_address`,
`initiator_pubkey`, `challenge`, `response_pubkey`, `response_signature`,
`expires_at`, `consumed_at`.

**Verify:** integration tests cover happy path + expiry + double-use rejection.

### Phase B3 — Push notifications

**Repo:** `reference/wallet-backend`

Wakes co-signer devices when a cosign request is created or a partial
signature lands. **Requires infrastructure decisions out of scope for code
alone:** APNs cert/key, FCM credentials, push provider choice.

Minimum surface:
- `POST /v1/devices/push-tokens` — register a device push token
- Hook in `CosignService.CreateRequest` and `CosignService.AddSignature` to
  fan out a push to all registered tokens for the same smart account
  address (excluding the originating device's token)

**Verify:** push received on a 2nd device within 5s of cosign request
creation on the 1st device, in staging.

### Phase B4 — Expiry sweeper

**Repo:** `reference/wallet-backend`

Periodic job calls `CosignService.PurgeExpired` every minute. Trivial; can
be a goroutine in `serve.go` or a separate cron. Defer until B2+B3 land.

---

## Open questions

1. **Encryption of queued payloads.** Should `unsigned_tx_xdr` and
   `auth_entry_xdr` be encrypted client-side before storage? Trades server
   complexity (none) for client complexity (key sharing between paired
   devices). Recommend deferring until the unencrypted version ships and is
   validated.
2. **Signer identity surface.** `signer_key` in
   `latch_cosign_signatures` is opaque to the backend. Mobile must agree on
   a canonical form: G-address for Ed25519, hex pubkey for External — so
   the unique constraint actually catches duplicate signers. Document in
   `src/api/cosign.ts` when it's built.
3. **History retention.** Today, terminal (submitted/cancelled/expired)
   rows stay forever. Add a retention policy in B4? Probably keep ≤30 days
   for debuggability.

---

## Verification matrix

| Phase | What "done" means |
|---|---|
| B1 | All endpoints respond per spec; `go vet ./...` clean; integration tests pass with real Postgres |
| A1 | DONE — wallet-only users now reach all 6 endpoints; principal scope removed; tests cover both auth modes |
| P1 | `bun run lint` clean; current single-device flows still work on testnet |
| P2 | New device pairs via both QR and link code on testnet; admin op requires 2 devices |
| B2 | Pair-code happy path + expiry + dup-use tests pass |
| B3 | Push delivered ≤5s on staging |
| B4 | Sweeper transitions expired rows without intervention |

---

## Phase P3 — At-deploy multisig (restored from `multisig` branch)

**Repo:** `latch-mobile`
**Status:** UI screens restored from the existing `multisig` branch
(`994ea36`); the only file modification is `shared-wallet-review.tsx`'s
deploy hook. On-chain deploy path written but not testnet-verified.

### Flow

`choose-wallet` (Shared) → `create-shared` (name + purpose) →
`add-members` (member list via QR scan / paste address / invite) →
`approval-number` (threshold slider) → `shared-wallet-review` (summary
+ deploy trigger) → `shared-wallet-result` (success with address +
QR, or failure with retry).

State flows through `expo-router` URL params at each hop; there is no
ephemeral store needed for this flow.

### Files

**Restored unchanged from `multisig` branch:** 32 files including
`approval-number.tsx`, `shared-wallet-review.tsx`,
`shared-wallet-result.tsx`, the modified `add-members.tsx`, and all
supporting components under
`src/components/{approval-number,add-members,shared-wallet-review,shared-wallet-result}/`.

**New:**
- `src/lib/multisig-address.ts` — deterministic salt + canonical sort

**Modified:**
- `src/api/smart-account.ts` — added `deployMultiSigSmartAccount` +
  `predictMultiSigAddress` (single-signer paths unchanged)
- `app/(onboarding)/shared-wallet-review.tsx` — `handleCreate` now
  calls `deployMultiSigSmartAccount` instead of pushing a hardcoded
  address. **No visual JSX was changed.** Each member's `value` is
  validated as a G-address; non-G inputs are skipped with an explicit
  error routed to `shared-wallet-result`.

### Verification

| Check | Status |
|---|---|
| `bun run lint` | 0 errors |
| `bunx tsc --noEmit` (P3 files) | Clean |
| End-to-end testnet deploy | UNVERIFIED |

### Encoding decisions

The shared-wallet flow uses **C-addresses** (Stellar contract addresses)
for every member, with `Delegated(C-address)` as the on-chain signer
encoding. Each member must already have a deployed Latch smart account
(their own C-address). The shared wallet is then a recursive multisig
above those accounts — when it asks a member to authorize, that
member's own smart account runs its own `__check_auth`.

- `PasteAddressView` regex: `^C[A-Z2-7]{55}$` (C-addresses only)
- `ScanQRSheet` validation: `StrKey.isValidContract(data)` (silently
  ignores non-C QRs, keeps scanning)
- `ScannedMemberForm` "Add Member" button: disabled if the address
  isn't a valid C-address (defense-in-depth)
- `shared-wallet-review` deploy: validates with `StrKey.isValidContract`,
  encodes as `{ kind: 'delegated', address }`

### Caveats

1. **No initiator key auto-provisioning.** The Shared flow does not run
   through `/(auth)/biometric` and does not generate a local key for the
   wallet creator. Participants are expected to have their own deployed
   Latch accounts (Personal flow) before joining a shared wallet. If
   the wallet creator wants to be a signer themselves, they must add
   their own C-address as a member. This trade-off keeps the flow free
   of cross-account complexity at the cost of requiring participants to
   pre-onboard.
2. **Email-invite members are filtered out at deploy time.**
   `ChooseMethodSheet` accepts emails and adds them as `status='pending'`
   members. The deploy filters these out and routes to the failure
   screen if doing so drops the eligible signer count below 2 or below
   the chosen threshold. Future work: backend invite flow that resolves
   email → C-address before deploy.
3. **Salt is content-addressed.** Same (signer set, threshold) → same
   deployed C-address. Trying to deploy the same combo twice will fail.
4. **`shared-wallet-result` uses its existing failure copy.** The
   `errorMessage` param is forwarded but the screen doesn't render it
   yet; check `console.error` / the route params during testing.
5. **Persisted multisig accounts use `index: -1`** (sharing the passkey
   sentinel) with empty `gAddress` + `publicKeyHex` and no
   `credentialId`. Rehydrate's `index >= 0` mnemonic check correctly
   leaves `activeWallet=null` for these accounts.

---

## Out of scope for this plan

- Social recovery (third-party guardians)
- Per-context spending limits on the default rule
- Hardware-wallet signers
- Cross-account migration (importing an existing classic Stellar account
  with multisig into a smart account)
