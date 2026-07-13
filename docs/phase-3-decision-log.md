# Phase 3 — Decision Log

How we arrived at the Phase 3 plan (`phase-3-wallet-auth-and-history.md`).

This document records the questions asked, options considered, and reasoning
that led to the chosen approach. Read this first if you want to understand
*why* the plan looks the way it does. Read the plan itself for *what* to build.

---

## Starting point

Phase 2 was complete: Latch's REST endpoints (`/v1/auth/*`, `/v1/backup`,
`/v1/recovery/*`, `/v1/prices`) had been ported into the Stellar wallet-backend
repo with the same URL paths and response shapes the mobile app expected. The
mobile app could swap backends by changing a single env var.

End-to-end verification on testnet had confirmed:
- Auth flow (register → verify → access/refresh tokens) worked
- Backup store/retrieve worked
- Recovery flow worked
- Prices worked
- Ingest service was running and indexing testnet
- A real transaction on `CABAC52X...` was visible in wallet-backend's GraphQL
  output

That left an open question.

---

## The trigger question

**"So is the mobile application suited for this backend to fetch balance and
transaction history?"**

Investigation showed the answer was **no, not currently**:

- `src/hooks/use-portfolio.ts` calls Soroban RPC `getLedgerEntries` directly
  via XHR. Wallet-backend isn't involved.
- `src/hooks/use-stellar-transactions.ts` calls Horizon
  `/accounts/{gAddress}/operations` directly via XHR. Wallet-backend isn't
  involved.

So Phase 2 had unlocked auth/backup/recovery/prices through wallet-backend,
but the most data-heavy mobile workloads — portfolio and history — were still
hitting raw chain endpoints.

---

## Options surfaced

Three migration shapes were on the table:

| | Option A — Leave as-is | Option B — Full migration | Option C — Hybrid |
|---|---|---|---|
| Balance | Direct RPC (current) | Wallet-backend GraphQL | Direct RPC (unchanged) |
| History | Direct Horizon/RPC (current) | Wallet-backend GraphQL | Wallet-backend GraphQL |
| Effort | Zero | High | Medium |
| Wins | Simplicity | One unified backend | Real win: indexed pagination on history; latency win: RPC stays for balance |

**Option C won** because:
1. Balance is read often and needs to be instantaneous — RPC is already fast
   and stateless; nothing to gain by adding a hop.
2. Transaction history is paginated, requires merging multiple chain sources,
   and is where today's mobile XDR-parsing code is most painful. Indexed
   server-side queries are a real upgrade here.
3. The cost is contained — only `use-stellar-transactions.ts` changes; the
   portfolio hook is untouched.

---

## The auth question

Switching history fetching to wallet-backend exposed an auth gap. The existing
Latch JWT is only issued after email verification (which currently only
happens inside the backup flow). That meant:

**Users who skip backup have no JWT and would be locked out of their own
transaction history.**

This was non-negotiable — the wallet has to work for every user, regardless of
whether they've registered an email.

Three candidate solutions were considered:

### Candidate 1 — Embedded bundler key signing
Reuse `EXPO_PUBLIC_BUNDLER_SECRET` (already embedded in the mobile bundle) to
sign GraphQL requests. Add its public key to `CLIENT_AUTH_PUBLIC_KEYS` on
wallet-backend.

- Pro: Zero new infrastructure. Zero user-visible friction.
- Pro: Works for every user — no email dependency.
- Con: Static secret. Anyone reverse-engineering the APK gets the key.
- Con: No per-user authorization. Every request authenticates as "the Latch
  app", not as a specific wallet.

### Candidate 2 — Open GraphQL for reads
Run wallet-backend with `CLIENT_AUTH_PUBLIC_KEYS=""`. Anyone can hit
`/graphql/query`.

- Pro: Zero work.
- Con: No rate limiting per identity, no abuse control, no per-user authz.

### Candidate 3 — Device-bound JWT
Add a `POST /v1/auth/device` endpoint that mints a token keyed to a
device-generated UUID. Mobile calls it once on cold start and persists it.

- Pro: No email dependency.
- Pro: Per-install rate limiting becomes possible.
- Con: Device identity is a weak proof — anyone replaying the device UUID gets
  the same token.
- Con: New backend + mobile state to maintain.

---

## User constraint

The user explicitly stated: **"I don't really want the simplest, I want the
most secure, most practical and less friction option."**

This ruled out Candidate 1 (insecure static secret) and Candidate 2 (no
authz). Candidate 3 was practical but device identity is a weak basis for
authentication. None hit all three criteria cleanly.

---

## The chosen approach — SEP-10-inspired wallet sign-in

A fourth option emerged that did:

**The user's wallet key is the identity. The server issues a one-time nonce,
the wallet signs it, the server verifies the signature and returns a JWT
scoped to that wallet.**

This matches the design intent of SEP-10 (Stellar's standard for wallet auth
against anchors) but simplified — no full Stellar transaction as the
challenge, just a JSON nonce. The crypto is the same; the framing is lighter.

### Why it beat the alternatives

| Criterion | Candidate 1 (bundler key) | Candidate 3 (device JWT) | Wallet sign-in |
|---|---|---|---|
| Bypass by reversing APK | Possible (static secret) | Hard | **Impossible — signature required** |
| Per-user authorization | No | Per device | **Per wallet** |
| Skip-backup users supported | Yes | Yes | Yes |
| Server holds per-user secrets | No | No | No |
| Friction (mnemonic users) | None | None | None (silent signing) |
| Friction (passkey users) | None | None | One biometric prompt per session — already part of existing flow |
| Alignment with wallet-backend's existing auth | Reuses `ClientAuthPublicKeys` (intended) | Mismatch | **Matches the original design intent** |

### Why it specifically works for Latch

Latch is a wallet app — by definition every user has a private key (Ed25519
mnemonic or P-256 passkey). Using that key for API authentication doesn't add
any new dependency; it just reuses an asset every user already has.

The passkey path is especially clean: the same Face ID prompt that already
authorizes transactions can be reused to sign the auth challenge. The user
doesn't see a separate "log in" step — it's the same biometric they tap to
send a transaction.

The server stores no per-user credential. Every session is bound to provable
control of an actual wallet key. Revocation is just "let the JWT expire".

---

## What got deferred

A few things came up in discussion that didn't make it into Phase 3:

1. **Should the wallet JWT also authorize backup endpoints?**
   Decision: keep wallet-scope and email-scope separate. Backup endpoints
   stay email-scoped because backup is fundamentally about email-recoverable
   credentials. Revisit only if product wants a one-token-fits-all UX.

2. **Full SEP-10 conformance.**
   Decision: not required. SEP-10's transaction-as-challenge format adds
   complexity for no security benefit in this internal-API context. The
   simplified nonce-JSON approach is documented as "SEP-10-inspired" rather
   than claiming compliance.

3. **Replacing Horizon for classic-only G-address activity.**
   Out of scope. The priority is passkey C-address history. Mnemonic G-address
   users already work via Horizon and don't need migration urgency.

4. **Migrating balance fetching.**
   Stays on direct Soroban RPC. The reasons are in the "Options surfaced"
   table above.

---

## Open questions still to resolve

Listed in the plan document under "Open questions". They are not blockers
for the first step (3.1 — nonce service); they need answers before steps
3.3 (smart account storage path) and 3.10 (mobile passkey signing) are
implemented.

---

## Summary of the path

```
Phase 2 complete
   │
   ▼
"Is mobile suited to use wallet-backend for balance + history?"
   │
   ▼ Answer: not yet. Mobile uses direct RPC/Horizon.
   │
   ▼
Pick a migration shape: A / B / C
   │
   ▼ Chose C (hybrid: RPC for balance, wallet-backend for history)
   │
   ▼
"How do users without email/backup authenticate to GraphQL?"
   │
   ▼ Rejected: embedded static secret (insecure)
   │ Rejected: open GraphQL (no authz)
   │ Rejected: device JWT (weak identity)
   │
   ▼
SEP-10-inspired wallet sign-in
   │
   ▼ Why: zero static secrets, per-wallet authz, works for all users,
   │       aligned with wallet-backend's existing design intent, friction
   │       free for mnemonic users, biometric reuse for passkey users
   │
   ▼
Phase 3 plan: 13 steps, ~5–7 days
```
