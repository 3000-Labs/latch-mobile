# Sprint Plan: D4 (Wallet Feature Parity) + D5 (dApp Interaction Flow)

_Audited: 2026-05-17_

---

## Current State

### D4 — Wallet Feature Parity + Session Keys

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 4.1 | Send/receive XLM + assets | **DONE** | `app/send-token.tsx`, `app/receive-token.tsx`, `src/api/send-token.ts` |
| 4.2 | Token balances + portfolio view | **DONE** | `app/(tabs)/index.tsx`, `src/hooks/use-portfolio.ts` |
| 4.3 | Asset list + metadata (icons/symbols/decimals) | **DONE** | `src/constants/known-tokens.ts`, `src/hooks/use-token-list.ts` |
| 4.4 | Transaction history + detail + filters | **DONE** | `app/(tabs)/history.tsx`, `app/transaction/[id].tsx`, `src/hooks/use-stellar-transactions.ts` |
| 4.5 | Session keys: create + scope selection | **PARTIAL** | `src/components/profile/SessionKeyStep1/2/3.tsx` — UI complete, no on-chain call |
| 4.6 | Session keys: list + revoke | **PARTIAL** | `src/components/profile/PermissionsSheet.tsx` — list renders local state only, revoke stubbed |
| 4.7 | Policy UI: threshold | **MISSING** | `SignersSheet.tsx` is hardcoded mock, no contract call |
| 4.8 | Policy UI: spending limit | **PARTIAL** | Form input captured in SessionKeyStep2, no enforcement or persistence |
| 4.9 | QA vs Freighter parity | **NOT STARTED** | Reference code present; no checklist |

**Summary:** 4 of 9 items complete. Session keys are the critical gap — UI is built but all backend (on-chain contract calls, persistence, revoke) is absent.

---

### D5 — dApp Interaction Flow

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 5.1 | Signing request spec | **MISSING** | No spec, no URL format defined |
| 5.2 | Deep-link handler | **MISSING** | `latch` scheme defined in `app.config.js:16`; no route handles it |
| 5.3 | Transaction review UI | **MISSING** | History detail view exists for settled txns only, no XDR parsing |
| 5.4 | Signing flow + error handling | **MISSING** | `confirm-auth.ts` is biometric-only, no XDR signing |
| 5.5 | Redirect back to dApp | **MISSING** | No callback mechanism |
| 5.6 | refractor.space integration | **MISSING** | Zero references in codebase |
| 5.7 | Sample dApp | **MISSING** | Not started |

**Summary:** D5 is ~0% complete beyond the URL scheme stub in `app.config.js`.

---

## Assumptions (confirm or correct before coding)

1. The smart account contract exposes `add_session_key`, `remove_session_key`, and `get_session_keys` methods (or equivalent). Need actual method names + parameter types.
2. A session key is registered by public key (Ed25519 hex or 32-byte buffer), spend limit (stroops as i128), and expiry (ledger sequence or Unix timestamp as u64).
3. Deep-link scheme stays `latch://` (not Universal Links) for testnet phase.
4. dApp callback is a plain URL redirect, not WebSocket or polling.
5. Spending limit enforcement lives at the contract level (per session key), not as a separate policy object.

---

## D4 Remaining Work

### D4-A: Session Key Backend (blocks 4.5, 4.6, 4.8)

**Done when:** A session key created in the UI is submitted as a real Soroban contract call; it appears on-chain; the list fetches live on-chain state; revoke submits a second contract call.

**Steps:**

1. **Audit contract interface**
   - Read `src/api/smart-account.ts` for existing `invokeContract` helpers
   - Read `reference/stellar-dev-skill/skill/contracts-soroban.md` for invocation pattern
   - Confirm method signatures

2. **Create `src/api/session-keys.ts`**
   - `generateSessionKeypair()` — fresh Ed25519 keypair, private key in SecureStore under `SECURE_KEYS.SESSION_KEY_<id>`
   - `addSessionKey(smartAccountAddress, publicKeyHex, spendLimitStroops, expiryLedger, allowedContracts[])` — XHR-based Soroban `invokeContractFunction`
   - `listSessionKeys(smartAccountAddress)` — query ledger entries, parse contract storage
   - `revokeSessionKey(smartAccountAddress, publicKeyHex)` — invoke `remove_session_key`
   - All calls signed with primary signer via biometric gate

3. **Wire `PermissionsSheet.tsx`**
   - Replace `useState<Permission[]>([])` with `useQuery` → `listSessionKeys`
   - On Step 3 submit: call `addSessionKey` with form values
   - Add revoke handler to `PermissionItem` → `revokeSessionKey` + cache invalidation
   - Duration → ledger sequence offset (1 day ≈ 17,280 ledgers at 5s/ledger)

4. **Map "allowed actions" to contract allowlist**
   - Transfer → SAC contract address for the token
   - Swap → Soroswap router address
   - Offers → DEX contract address (if applicable)
   - Store mapping in `src/constants/contracts.ts`

---

### D4-B: Threshold Policy UI (4.7)

**Done when:** User can set M-of-N signing threshold via `SignersSheet`; value is submitted to the contract and confirmed on-chain.

**Steps:**

1. Read `src/components/profile/SignersSheet.tsx` — understand current mock
2. Add threshold stepper to `SignersSheet`: "Require ___ of ___ signers" (min 1, max = signer count)
3. Create `src/api/policy.ts`
   - `setThreshold(smartAccountAddress, threshold: number)` — XHR invoke `set_threshold`
4. Wire "Save" action → `setThreshold`

---

### D4-C: Freighter Parity Checklist (4.9)

A written `docs/freighter-parity.md` with columns: **Feature | Freighter | Latch | Decision**.

Known gaps from audit:
- Hardware wallet (Ledger): Freighter yes → Latch out of scope for D4
- XDR-based transaction review: Freighter yes → Latch partial (in D5)
- Multiple signer types: Freighter (Freighter acct + hardware) → Latch (Ed25519 + passkey)

---

## D5 Work (all new)

### D5-1: Signing Request Spec

**Done when:** A constants file and brief doc define the URL format both sides implement.

**Proposed spec:**

```
Request (dApp → Wallet):
  latch://sign
    ?xdr=<base64url XDR of unsigned transaction or auth entry>
    &callback=<url-encoded callback URL>
    &network=<testnet|mainnet>
    &refractor=<refractor-payload-id>    ← mutually exclusive with xdr
    &label=<human-readable request label>

Response (Wallet → dApp via redirect):
  <callback>
    ?status=<success|cancelled|error>
    &xdr=<base64url signed XDR>          ← only on success
    &error=<error-code>                  ← only on error

Error codes:
  NETWORK_MISMATCH | USER_CANCELLED | SIGNING_FAILED | INVALID_PAYLOAD
```

**Create `src/constants/signing-spec.ts`** with these param names as string constants.

---

### D5-2: Deep-Link Route Handler

**Done when:** `latch://sign?...` opens the app and renders the signing review screen without crash.

**Steps:**

1. **Update `app.config.js`** — add `intentFilters` for Android:
   ```js
   intentFilters: [{ action: 'VIEW', data: [{ scheme: 'latch' }], category: ['BROWSABLE', 'DEFAULT'] }]
   ```
   Expo Router auto-maps `latch://sign` → `app/sign.tsx`.

2. **Create `app/sign.tsx`**
   - Read params via `useLocalSearchParams()`: `xdr`, `callback`, `network`, `refractor`, `label`
   - If `refractor` present: fetch from refractor.space (D5-6)
   - If `network` mismatches `ACTIVE_NETWORK`: show error + cancel-redirect
   - Render `<SigningReviewScreen>`

3. **Verify cold-start deep link** — confirm auth gate in `_layout.tsx` doesn't swallow the initial URL before routing

---

### D5-3: Transaction Review UI

**Done when:** Given a base64 XDR string, the screen renders each operation in plain English with fee, network, and source account.

**Steps:**

1. **Create `src/lib/xdr-parser.ts`**
   - `parseTransactionEnvelope(xdr: string): ParsedTransaction`
   - Returns: `{ source, fee, network, operations: ParsedOp[] }`
   - `ParsedOp`: `{ type, humanReadable, asset?, amount?, destination? }`
   - Use `@stellar/stellar-sdk`: `TransactionBuilder.fromXDR()`, iterate `tx.operations`
   - Operation types: `payment`, `pathPaymentStrictSend`, `changeTrust`, `invokeHostFunction` (decode SAC `transfer` args), `createAccount`

2. **Create `src/components/signing/SigningReviewCard.tsx`**
   - Header: label, source account (truncated), fee in XLM, network badge
   - Scrollable list of `OperationRow` components
   - Approve + Reject buttons at bottom

3. **Wire into `app/sign.tsx`**
   - Parse XDR on mount; show skeleton while loading
   - Invalid XDR → error state with cancel-redirect
   - Reject → `redirectToDapp(callback, { status: 'cancelled' })`
   - Approve → D5-4 signing flow

---

### D5-4: Signing Flow + Error Handling

**Done when:** Approval triggers biometric auth, the transaction is signed with the user's registered signer, and a valid signed XDR is produced.

**Steps:**

1. **Extend `src/utils/confirm-auth.ts`**
   - Add `signTransaction(xdr: string, signerType: 'ed25519' | 'passkey'): Promise<string>`
   - Ed25519: load keypair from SecureStore → `Keypair.fromSecret(secret).sign(txHash)` → `tx.addSignature()` → serialize
   - Passkey: use existing P-256 signing from `src/lib/passkey-webauthn.ts`

2. **Wire approve in `app/sign.tsx`**
   - Gate: call `confirmAuth()` biometric prompt first
   - Call `signTransaction(xdr, signerType)`
   - Show loading during signing
   - Success → D5-5 redirect
   - Error states:
     - Biometric cancelled → toast, stay on review screen
     - SecureStore key missing → "wallet not configured" error
     - Signing failure → error + offer cancel-redirect

---

### D5-5: Redirect Back to dApp

**Done when:** After signing, control returns to the dApp with signed XDR in the callback URL.

**Steps:**

1. **Create `src/lib/dapp-redirect.ts`**
   - `redirectToDapp(callback: string, result: SigningResult): void`
   - Success: `${callback}?status=success&xdr=${encodeURIComponent(signedXdr)}`
   - Error: `${callback}?status=error&error=<code>`
   - Cancelled: `${callback}?status=cancelled`
   - Uses `Linking.openURL()` from `expo-linking`

2. **Wire into `app/sign.tsx`** — call on: successful signing, reject button, network mismatch error

---

### D5-6: refractor.space Integration

**Done when:** `refractor=<id>` in the signing URL causes the wallet to fetch XDR from `https://refractor.space/api/payloads/<id>` before rendering the review screen.

> **Open question:** Need API docs for refractor.space — confirm endpoint format and auth.

**Steps:**

1. **Create `src/api/refractor.ts`**
   - `fetchPayload(id: string): Promise<string>` — GET `https://refractor.space/api/payloads/<id>`, returns XDR string
   - `storePayload(xdr: string): Promise<string>` — POST to store, returns `id` (for sample dApp use)
   - Use Axios (standard HTTPS, not Soroban RPC)

2. **Wire into `app/sign.tsx`** — if `refractor` param present, call `fetchPayload(id)`, use result as XDR input

---

### D5-7: Sample dApp

**Done when:** A deployed web page sends an unsigned transaction to the wallet, user signs it, testnet transaction executes, dApp shows the result.

**Steps:**

1. **Create `/sample-dapp/index.html`** (no framework, CDN only)
   - Use `@stellar/stellar-sdk` CDN build
   - Hardcode: transfer 1 XLM from wallet's smart account to a test G-address
   - Build unsigned transaction XDR
   - Redirect to `latch://sign?xdr=<base64>&callback=<this-page-url>&network=testnet&label=Test+Transfer`
   - On return: read URL params → show status + signed XDR (or error)

2. **Deploy** to GitHub Pages or Vercel for a stable public URL

3. **Smoke test both paths:**
   - URL-embedded XDR (direct `xdr=` param)
   - refractor.space (store payload first, pass `refractor=<id>`)

---

## Sequencing

```
Week 1 — D4 completion
  D4-A  Session key backend          ← main effort; unblocks 4.5, 4.6, 4.8
  D4-B  Threshold policy UI          ← independent
  D4-C  Freighter parity doc         ← independent

Week 2 — D5 foundation
  D5-1  Signing spec + constants     ← unblocks everything in D5
  D5-6  refractor.ts client          ← independent
  D5-2  Deep-link route shell        ← needs D5-1
  D5-3  XDR parser + review UI       ← needs D5-1

Week 3 — D5 completion
  D5-4  Signing flow                 ← needs D5-3
  D5-5  Redirect to dApp             ← needs D5-4
  D5-7  Sample dApp + deploy         ← needs D5-5
  E2E smoke test (XDR + refractor paths)
```

---

## Open Questions

1. **Smart account contract:** What are the exact method names and parameter types for session key registration, revocation, and threshold? Can you share the ABI or contract source?
2. **Session key public key type:** Ed25519 hex string, raw 32-byte buffer, or Stellar G-address?
3. **refractor.space:** API docs / endpoint format for fetching and storing payloads?
4. **Sample dApp hosting:** Vercel, GitHub Pages, or elsewhere?
5. **Deep-link scheme:** Stay with `latch://` for testnet, or set up Universal Links now?
