# Implementing Latch Multisig against latch-api

A walkthrough for the **Latch web wallet** (`reference/latch`, Next.js + Prisma + `@stellar/stellar-sdk`) on how to use the multisig surface of **latch-api** (`reference/latch-api`, Go/Gin).

The mobile wallet (`latch-mobile`) is the reference implementation of this exact protocol. Everything below is the web translation of its `src/lib/cosign-crypto.ts`, `wallet-cosign-key.ts`, `sealed-wck.ts`, `membership.ts`, and `src/api/*` modules. When in doubt, those files + `latch-mobile/docs/multisig-encrypted-queue.md` are the canonical spec.

---

## 1. The mental model: a zero-knowledge backend

latch-api stores and relays multisig state but is **deliberately blind**. It never sees:

- the wallet's C-address (smart-account contract address),
- any member's device/signer key,
- the contents of any transaction or signature.

It only ever stores **opaque ciphertext** and **one-way blind identifiers** (64-char lowercase hex). The backend cannot link a user to a wallet, reverse a blind id to an address, or read a payload. Authentication (`RequireAuth`, a Bearer JWT) exists only to gate anonymous abuse — the authenticated identity is used **only for the audit actor**, never to scope data. Scoping is purely cryptographic: if you can compute the blind `queue_index`, you're a member; if you can't, the queue is invisible to you.

This means **all the security lives in the client**. Get the derivations and encryption right and the backend is a dumb, safe pipe. Get them wrong and you either leak data or lock members out.

There are five independent sub-systems:

| Sub-system | Endpoints | Purpose |
|---|---|---|
| **Wallet auth** | `/v1/auth/challenge`, `/v1/auth/sign-in` | Get a Bearer JWT by proving wallet control (no email needed) |
| **Memberships** | `/v1/memberships` | Discovery: tell a joining device which wallets it belongs to |
| **WCK bundles** | `/v1/wck-bundles/:pickup_key` | Distribute the shared Wallet Cosign Key to members, sealed |
| **Cosign queue** | `/v1/cosign/requests…` | Propose → collect signatures → submit a multisig tx |
| **Push tokens** | `/v1/push-tokens` | (Optional) notify members a request needs them, content-free |

---

## 2. The Wallet Cosign Key (WCK) — the keystone

Everything hinges on one secret: **the WCK, a 32-byte AES-256 key, one per shared wallet, held by every member, never sent to the server.**

- The creator generates it at wallet creation.
- It's used to (a) derive the blind `queue_index` and `blind_signer_id`, and (b) AES-256-GCM encrypt every payload.
- It's distributed to other members **sealed** (ECIES boxed to each member's on-chain key) via the WCK-bundle endpoint, or out-of-band via a `latch://cosign-key` deep link.

Store it in the browser keyed by the C-address. Because this is a web app, prefer **IndexedDB with a non-extractable `CryptoKey`** where possible, or at minimum an origin-scoped store you treat as sensitive — never `localStorage` shared across origins. (The mobile app uses `expo-secure-store`; the web equivalent is IndexedDB-held key material behind the user's session.)

```ts
// 32 random bytes — the WCK
const wck = crypto.getRandomValues(new Uint8Array(32));
```

---

## 3. The cryptographic contract with the backend

These derivations are the wire contract. They must match the mobile client **byte for byte**, because members on different platforms compute the same blind ids and decrypt each other's payloads. The backend validates every blind id against `^[0-9a-f]{64}$` (lowercase hex, 64 chars) — i.e. exactly a SHA-256 / HMAC-SHA-256 digest in hex.

Web shims used throughout (Web Crypto + `@noble/*` for the curve boxing — add `@noble/curves` and `@noble/hashes`, the same libs the mobile client uses):

```ts
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';

const enc = new TextEncoder();

function toHex(b: Uint8Array): string {
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// base64url WITHOUT padding — the cosign envelope alphabet
function bytesToB64url(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
```

### 3.1 Blind queue index — scopes a wallet's request queue

```ts
// HMAC-SHA256(WCK, "cosign-queue:" + Caddress) → 64-char hex
export function queueIndexFor(wck: Uint8Array, account: string): string {
  return toHex(hmac(sha256, wck, enc.encode(`cosign-queue:${account}`)));
}
```

Every member derives the same `queue_index`. It's both the bucket key **and** the access capability — a non-member can't compute it, so they can't find or list the queue.

### 3.2 Blind signer id — per-member dedupe token

```ts
// HMAC-SHA256(WCK, "cosign-signer:" + signerKeyHex) → 64-char hex
export function blindSignerId(wck: Uint8Array, signerKeyHex: string): string {
  return toHex(hmac(sha256, wck, enc.encode(`cosign-signer:${signerKeyHex}`)));
}
```

`signerKeyHex` is the member's on-chain signer key in hex (ed25519 pubkey, or webauthn `key_data`). The backend uses this only to dedupe signatures (`ON CONFLICT DO NOTHING`); it never sees the real key.

### 3.3 Membership blind id — keys discovery on a member's *public* key

Note this one is a **plain SHA-256, not HMAC** — discovery has to work *before* the joining device has the WCK (chicken-and-egg), so it can only depend on the member's own public key.

```ts
// SHA256("latch-membership:v1:" + keyDataHex.toLowerCase()) → 64-char hex
export function membershipBlindId(keyDataHex: string): string {
  return toHex(sha256(enc.encode(`latch-membership:v1:${keyDataHex.toLowerCase()}`)));
}
```

### 3.4 WCK bundle pickup key — secret-free, derived from the public C-address

```ts
// SHA256("latch-wck-pickup:v1:" + Caddress) → 64-char hex
export function pickupKeyFor(account: string): string {
  return toHex(sha256(enc.encode(`latch-wck-pickup:v1:${account}`)));
}
```

A joining member knows only the public C-address, so the pickup key can't require the WCK. Safe because the bundle behind it is sealed — possession of the key yields only ciphertext that on-chain members alone can open.

### 3.5 Payload encryption — AES-256-GCM, account-bound

Plaintext is always a **base64 XDR string** (the assembled tx, or a `SorobanAuthorizationEntry`). The envelope is `"v1:" + base64url(iv[12] || ciphertext || tag[16])`, and the **C-address is bound in as GCM AAD** so a blob can't be replayed under a different wallet.

```ts
const VERSION = 'v1', IV_LEN = 12;

export async function encryptForWallet(wck: Uint8Array, plaintext: string, account: string) {
  const key = await crypto.subtle.importKey('raw', wck, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const ctAndTag = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: enc.encode(account) }, // AAD = C-address
      key,
      enc.encode(plaintext),
    ),
  ); // Web Crypto appends the 16-byte tag to the ciphertext automatically
  const env = new Uint8Array(iv.length + ctAndTag.length);
  env.set(iv); env.set(ctAndTag, iv.length);
  return `${VERSION}:${bytesToB64url(env)}`;
}

export async function decryptForWallet(wck: Uint8Array, envelope: string, account: string) {
  const sep = envelope.indexOf(':');
  if (sep < 0 || envelope.slice(0, sep) !== VERSION) throw new Error('bad envelope version');
  const all = b64urlToBytes(envelope.slice(sep + 1));
  const iv = all.slice(0, IV_LEN);
  const ctAndTag = all.slice(IV_LEN); // ciphertext + appended tag
  const key = await crypto.subtle.importKey('raw', wck, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(account) },
    key,
    ctAndTag,
  );
  return new TextDecoder().decode(pt); // GCM fails closed on any tamper / wrong key / wrong account
}
```

> ⚠️ Tag placement: Web Crypto concatenates the GCM tag onto the ciphertext, whereas the mobile code lays out `iv || ct || tag` explicitly with a 16-byte tag. The result is identical on the wire (`iv || ct || tag`) — just don't double-append the tag. The mobile encoder/decoder and this one are interoperable.

### 3.6 Sealed WCK bundle (ECIES)

Distributing the WCK to members without a trusted channel: seal one copy per member, each boxed to that member's on-chain key — X25519 ECIES for ed25519 members, P-256 ECIES for webauthn members (ephemeral ECDH → HKDF-SHA256 → AES-256-GCM, HKDF info `latch-wck-seal-v1` / `latch-wck-seal-p256-v1`). All copies pack into one `bundle` string. This is the most involved piece; **port `latch-mobile/src/lib/sealed-wck.ts` directly** — it's pure `@noble/curves` + `@noble/hashes` + Web-Crypto-compatible AES-GCM, no React Native specifics in the algorithm itself. The bundle is an opaque string to the backend.

---

## 4. Wallet auth — getting a Bearer token

Every multisig endpoint needs `Authorization: Bearer <jwt>`. Latch web users may not have an email account, so use **wallet sign-in** (SEP-10-style): prove control of a wallet key, get a wallet-scope JWT. You authenticate as the **device's personal account**, never the multisig.

```ts
const API = process.env.NEXT_PUBLIC_API_BASE_URL!; // e.g. https://api.latch...

// 1) challenge
async function challenge(wallet: string, keyType: 'ed25519' | 'passkey') {
  const r = await fetch(`${API}/v1/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, key_type: keyType }),
  });
  const { data } = await r.json();
  return data.nonce as string; // single-use, ~60s TTL
}

// 2) sign the nonce and sign in
async function signIn(wallet: string, keyType: 'ed25519', nonce: string, signatureB64: string) {
  const r = await fetch(`${API}/v1/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, key_type: keyType, nonce, signature: signatureB64 }),
  });
  const { data } = await r.json(); // { access_token, refresh_token, expires_in }
  return data;
}
```

- **ed25519 (mnemonic/Freighter)**: sign the raw nonce bytes with the Stellar Ed25519 keypair; send `signature` as base64.
- **passkey (webauthn / P-256)**: send `authenticator_data`, `client_data_json`, `passkey_signature` (all base64) instead of `signature` — the backend verifies the WebAuthn assertion against the account's on-chain webauthn signer key. See `latch-api/internal/service/wallet_auth_service.go` + `webauthn_signin.go` for the exact verification, and mirror `latch-mobile/src/lib/wallet-auth.ts`.

Cache the access token and reuse it across calls; re-mint on 401. Collapse concurrent sign-ins into one in-flight promise (the mobile client does this — a pending-list poll otherwise triggers N challenge/sign-in round-trips and trips the rate limiter).

---

## 5. Lifecycle walkthroughs

### A. Creating a shared wallet (the creator)

After you deploy the multisig smart account on-chain (existing `reference/latch` factory flow), do three things — all idempotent and safe to fire-and-forget:

```ts
// 1. Generate + persist the WCK for this wallet
const wck = crypto.getRandomValues(new Uint8Array(32));
await storeWck(account, wck); // your IndexedDB-backed store, keyed by C-address

// 2. Announce membership so other members' devices can discover the wallet.
//    member_blind_ids = membershipBlindId() of every on-chain device-key signer.
const signers = await fetchOnChainSigners(account); // read the contract's signer set
const memberBlindIds = signers
  .filter((s) => (s.kind === 'ed25519' || s.kind === 'webauthn') && s.keyDataHex)
  .map((s) => membershipBlindId(s.keyDataHex));
await fetch(`${API}/v1/memberships`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ wallet_ref: account, member_blind_ids: memberBlindIds }),
});

// 3. Publish the sealed WCK bundle so members can pick the key up with zero touch.
const bundle = buildWckBundle(wck, recipientsFromSigners(signers)); // sealed-wck.ts port
await fetch(`${API}/v1/wck-bundles/${pickupKeyFor(account)}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ bundle }),
});
```

**Durability gotcha (known issue):** announce is fire-and-forget; a transient `429` can permanently drop the row so a signer never discovers the wallet. Persist an intent marker and re-fire the announce on next load until it lands (mirror `retryPendingAnnouncements` in `membership.ts`). The manual `latch://cosign-key` link is the fallback.

### B. Joining / discovering (a second member)

```ts
// 1. Compute my own membership blind id from my on-chain signer key, list my wallets.
const myBlindId = membershipBlindId(myKeyDataHex);
const r = await fetch(`${API}/v1/memberships?member_blind_id=${myBlindId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { data } = await r.json(); // { wallets: [{ wallet_ref, created_at }] }

// 2. For each discovered wallet_ref (a C-address), pick up its sealed WCK.
for (const w of data.wallets) {
  const account = w.wallet_ref;
  if (await hasWck(account)) continue;
  const br = await fetch(`${API}/v1/wck-bundles/${pickupKeyFor(account)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (br.status === 404) continue; // no bundle yet
  const { data: bd } = await br.json(); // { bundle }
  const wck = openWckBundle(bd.bundle, myKeyDataHex, myOpener); // sealed-wck.ts port
  if (!wck) continue; // not sealed for this device

  // 3. DEFENSE IN DEPTH: re-verify on-chain that this device is actually a signer
  //    before trusting the wallet. Discovery + bundles are advisory; the chain is truth.
  if (!(await isOnChainSigner(account, myKeyDataHex))) continue;
  await storeWck(account, wck);
}
```

Never trust a discovered wallet or an opened bundle on its own — **always re-verify membership against the contract's signer set on-chain** before adding the wallet, so a forged announcement or stray bundle can't inject a wallet you're not in.

### C. Proposing a multisig transaction

```ts
const wck = await getWck(account);

// 1. Build the assembled, unsigned Soroban tx for the multisig op (existing
//    stellar-sdk flow). Serialize to base64 XDR.
const unsignedXdr = assembledTx.toXDR(); // base64 string

// 2. Encrypt it under the WCK, account-bound, and POST to the queue.
const r = await fetch(`${API}/v1/cosign/requests`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    queue_index: queueIndexFor(wck, account),
    unsigned_tx_xdr: await encryptForWallet(wck, unsignedXdr, account),
    network: 'testnet', // or 'mainnet'
    threshold: requiredSignatures, // the on-chain threshold, min 1
  }),
});
const { data: request } = await r.json(); // 201 → the created request (has .id)
```

`threshold` is advisory metadata for the UI; the **real** threshold check happens on-chain at submission. Requests auto-expire server-side after ~23h (just under the client's on-chain signature validity window).

### D. Signing (every member, including the proposer)

```ts
const wck = await getWck(account);

// 1. Poll the queue for this wallet.
const r = await fetch(
  `${API}/v1/cosign/requests?queue_index=${queueIndexFor(wck, account)}`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const { data } = await r.json(); // { requests: [...] }

for (const req of data.requests) {
  // 2. Decrypt the tx, review it, sign your SorobanAuthorizationEntry (stellar-sdk).
  const unsignedXdr = await decryptForWallet(wck, req.unsigned_tx_xdr, account);
  const myAuthEntryXdr = await signSharedAuthEntry(unsignedXdr, myKey); // base64 XDR

  // 3. Encrypt your auth entry and attach it.
  await fetch(`${API}/v1/cosign/requests/${req.id}/signatures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      blind_signer_id: blindSignerId(wck, myKeyHex),
      auth_entry_xdr: await encryptForWallet(wck, myAuthEntryXdr, account),
    }),
  });
}
```

Adding a signature is idempotent on `blind_signer_id` — re-posting is a no-op. The response echoes the full request with all collected `signatures` and a `signature_count`.

### E. Aggregating and submitting

Once `signature_count` ≥ threshold, **any** member can finalize:

```ts
const full = await (await fetch(`${API}/v1/cosign/requests/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
})).json();
const req = full.data;

// 1. Decrypt each collected auth entry, aggregate onto the tx, submit to the
//    network with an ENFORCING simulation for the __check_auth footprint
//    (this is the authoritative on-chain threshold gate — see the note below).
const authEntries = await Promise.all(
  req.signatures.map((s) => decryptForWallet(wck, s.auth_entry_xdr, account)),
);
const unsignedXdr = await decryptForWallet(wck, req.unsigned_tx_xdr, account);
const txHash = await aggregateAndSubmit(unsignedXdr, authEntries); // stellar-sdk

// 2. Record the submission so the queue clears for everyone.
await fetch(`${API}/v1/cosign/requests/${id}/submission`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ tx_hash: txHash }),
});
```

> **Submission requires an enforcing simulation** for the `__check_auth` footprint, or the submit fails. This is proven on testnet in `latch-mobile` (`scripts/verify-multisig-transfer.js`, wired into `multisig-send.ts aggregateAndSubmit`). Port that aggregation/submit core — don't reinvent it.

To abandon a request: `DELETE /v1/cosign/requests/{id}` (idempotent).

### F. Push notifications (optional)

Register the browser's push token against the blind `{queue_index, blind_signer_id}` pairs the user watches, so members get a **content-free** "a request needs you" ping (the payload carries only the queue index, which the server already stores):

```ts
await fetch(`${API}/v1/push-tokens`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    push_token: browserPushToken,
    registrations: walletsIWatch.map((account) => ({
      queue_index: queueIndexFor(wckFor(account), account),
      blind_signer_id: blindSignerId(wckFor(account), myKeyHex),
    })),
  }),
});
// On logout: DELETE /v1/push-tokens/{push_token}
```

`POST` is replace-set semantics (it replaces *all* registrations for that token). On `AddSignature`, the backend notifies every registered member **except** the signer who just acted.

---

## 6. Endpoint reference

All responses are `{ "data": … }` on success and `{ "error": { "code", "message" } }` on failure. All multisig routes require `Authorization: Bearer <jwt>`.

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/v1/auth/challenge` | `{ wallet, key_type }` | `{ nonce, expires_in }` |
| POST | `/v1/auth/sign-in` | `{ wallet, key_type, nonce, signature \| passkey fields }` | `{ access_token, refresh_token, expires_in }` |
| POST | `/v1/memberships` | `{ wallet_ref, member_blind_ids[] }` | `{ message }` |
| GET | `/v1/memberships` | `?member_blind_id=hex64` | `{ wallets: [{ wallet_ref, created_at }] }` |
| PUT | `/v1/wck-bundles/{pickup_key}` | `{ bundle }` | `{ message, updated_at }` (409 if another account owns it) |
| GET | `/v1/wck-bundles/{pickup_key}` | — | `{ bundle }` (404 if none) |
| POST | `/v1/cosign/requests` | `{ queue_index, unsigned_tx_xdr, network, threshold }` | `201` → request |
| GET | `/v1/cosign/requests` | `?queue_index=hex64` | `{ requests: [...] }` |
| GET | `/v1/cosign/requests/{id}` | — | request + signatures |
| POST | `/v1/cosign/requests/{id}/signatures` | `{ blind_signer_id, auth_entry_xdr }` | request |
| POST | `/v1/cosign/requests/{id}/submission` | `{ tx_hash }` | `{ message }` |
| DELETE | `/v1/cosign/requests/{id}` | — | `{ message }` (idempotent) |
| POST | `/v1/push-tokens` | `{ push_token, registrations[] }` | `{ message }` |
| DELETE | `/v1/push-tokens/{token}` | — | `{ message }` |

The authoritative spec is `latch-api/docs/swagger.yaml` (and the handlers under `internal/handler/`). The DB shape is in `migrations/000008`–`000013`.

---

## 7. Web-specific notes (vs. the mobile reference)

- **Transport.** The mobile client uses raw `XMLHttpRequest` to dodge an Android OkHttp/TLS bug. On the web, just use `fetch` — that workaround does not apply.
- **Crypto.** Mobile uses `react-native-quick-crypto` + `@noble/*` because Hermes lacks Web Crypto and breaks on the Buffer polyfill. On the web you have the **Web Crypto API** (`crypto.subtle`) for AES-GCM / HMAC / SHA-256 and `crypto.getRandomValues` for entropy — use them. Keep `@noble/curves` + `@noble/hashes` only for the X25519/P-256 ECIES in the sealed bundle (Web Crypto's X25519 support is uneven across targets; `@noble` keeps it identical to mobile).
- **base64.** Mobile avoids `Buffer.toString('base64')` (broken under Hermes). On the web, `btoa`/`atob` are fine — but the cosign envelope is **base64url without padding**; apply the `+/→-_` swap and strip `=` (helpers in §3).
- **Hex casing.** Blind ids must be **lowercase** hex; the backend regex rejects uppercase. SHA-256/HMAC hex output is already lowercase — just don't upcase it anywhere.
- **WCK storage.** No `expo-secure-store` on the web. Use IndexedDB with a non-extractable `CryptoKey` if you can keep the WCK as a `CryptoKey` (you can, for the AES-GCM path — import it once with `extractable: false`). The derivations (§3.1–3.2) need the raw bytes for HMAC, so if you keep it non-extractable you'll instead derive the blind ids via an HMAC `CryptoKey`. Simplest correct option: hold the 32 raw bytes in an in-memory + IndexedDB store scoped to the authenticated session, and treat it like a password.

---

## 8. Security checklist (do not skip)

- [ ] WCK is 32 bytes from a CSPRNG; never logged, never sent to the server in the clear.
- [ ] `queue_index` / `blind_signer_id` use **HMAC**-SHA256 keyed by the WCK; `membership_blind_id` / `pickup_key` use **plain** SHA-256 (public-key inputs only). Don't mix these up.
- [ ] All blind ids are lowercase 64-char hex.
- [ ] Every payload is AES-256-GCM with the **C-address as AAD**; decrypt is allowed to fail closed (don't catch-and-ignore).
- [ ] Discovery and WCK bundles are **advisory** — re-verify on-chain signer membership before adding a wallet or trusting a key.
- [ ] WCK bundle uploads are bound to the uploader; handle the `409` (someone else owns the pickup key) rather than overwriting.
- [ ] Submission runs an **enforcing** simulation for `__check_auth`; the on-chain threshold is the real gate, not the queue's `threshold` field.
- [ ] Announce is durable: persist intent and retry on `429`/failure so members don't silently fail to discover.
- [ ] Collapse concurrent wallet sign-ins into one in-flight request to avoid rate-limit storms (per-wallet limit is 100 req/min; `rl:sub:` bucket).

---

## 9. Recommended build order

1. **Wallet auth** (§4) — you can't call anything else without a token. Verify you can mint a JWT end-to-end.
2. **Crypto primitives** (§3) — port and unit-test `queueIndexFor`, `blindSignerId`, `membershipBlindId`, `pickupKeyFor`, `encryptForWallet`/`decryptForWallet`. Cross-check a vector against the mobile client (same WCK + account ⇒ identical `queue_index` and a payload mobile can decrypt).
3. **Cosign happy path** (§5 C–E) on a wallet where you already hold the WCK locally — propose → sign → submit, single device first, then two.
4. **WCK distribution** (§3.6, §5 A.3/B) — port `sealed-wck.ts`, then wire publish + pickup.
5. **Membership discovery** (§5 A.2/B) with the durable-announce retry.
6. **Push** (§5 F) last — it's pure UX sugar.

Start on **testnet** (`network: 'testnet'`), and keep `latch-mobile`'s multisig modules open side-by-side — this guide is their web port, and they're the source of truth for any detail left implicit here.
