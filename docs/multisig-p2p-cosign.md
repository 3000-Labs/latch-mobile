# Multisig P2P Co-sign (backend-free)

**Status:** SHIPPED — this is the default cosign transport. Selected by
`src/lib/cosign-transport.ts` whenever `EXPO_PUBLIC_MULTISIG_BACKEND_ENABLED !== 'true'`;
the encrypted backend queue (`docs/multisig-encrypted-queue.md`) is the opt-in
alternative. Transfers shared-wallet approvals between devices without running a
coordination server.

## Goal

Let members of a delegated multisig wallet authorize a transfer by passing a
self-contained **co-sign packet** between their devices (QR / share-sheet /
deep link) instead of a backend request queue. No bespoke server; the only
network dependency is Soroban RPC (to simulate + submit), which every send
already needs.

This is the idiomatic Stellar multisig pattern (build an envelope, signers
append signatures, submit when threshold is met) and Bitcoin's PSBT pattern.
It reuses Latch's existing P2P QR plumbing from device pairing.

## Why this is possible

The wallet-backend's cosign endpoints do exactly one thing: **hold the
assembled transaction + collect partial signatures until threshold**. Nothing
about that requires a server — the same state fits in a blob the members hand
to each other. The chain only sees the final, fully-signed transaction either
way (the account contract is validate-all-at-once; there is no on-chain pending
state — see `shared-wallet-concerns.md` §5f/§6j).

## The artifact — Co-sign Packet (CSP)

A self-contained, serializable object. It is the off-chain `CosignRequest`
(`src/api/cosign.ts`) minus the server — same fields, generated client-side:

```jsonc
{
  "v": 1,                          // packet schema version
  "id": "<uuid>",                  // client-generated; dedupe + display only
  "network": "testnet",
  "smartAccountAddress": "C...",   // the multisig funds move FROM
  "unsignedTxXdr": "<base64>",     // ASSEMBLED tx: resource fees + footprint +
                                   //   pinned auth entries (nonce + expiration)
  "threshold": 2,
  "signatures": [                  // grows as members sign
    { "signerKey": "C<member>", "authEntryXdr": "<base64>" }
  ],
  "expiresLedger": 2949600,        // mirrors signatureExpirationLedger in the tx
  "createdAt": "2026-06-06T..."
}
```

**Security rule:** there is NO trusted "amount/destination" field. Each device
derives the human summary **by decoding `unsignedTxXdr`** and renders that for
approval. A relayer can't show "send 5 to Alice" while the bytes say "send 500
to Mallory" — the auth digest each member signs is computed over the tx, so any
tampering invalidates every signature. Members must **decode-and-display, never
trust a sidecar summary.**

## Transport

`unsignedTxXdr` + WebAuthn auth entries run ~1–2 KB — too big for a single
reliable QR (the pairing flow today passes only a pubkey + challenge). Three
tiers, pick per context:

| Transport | When | Mechanism |
|---|---|---|
| **Animated multi-part QR** | in-person / same room | chunk the CSP into N frames (à la Bitcoin UR/BBQr), cycle them; scanner reassembles. Reuses `pair-show-qr` / `pair-scan-qr`. |
| **Share-sheet file** | remote / async | export CSP as a `.latchtx` (or `.json`) blob; send via any messenger; recipient opens → app imports. |
| **Deep link** | small packets only | `latch://cosign?d=<base64url>` — only viable before signatures bloat it; falls back to file. |

Start with **file via share-sheet** (simplest, works remote, no QR-size pain),
add **animated QR** for in-person. Deep link is a nice-to-have.

## Flow

```
Creator                         Member B                    (anyone, threshold met)
  build assembled tx              scan/open CSP                splice all entries
  → CSP w/ 0 sigs                 decode + show summary        → submit to RPC
  sign own entry                  approve → sign own entry      → done (on-chain)
  → CSP w/ 1 sig                  append → CSP w/ 2 sigs
  show/share CSP        ───────▶  if threshold: submit
                                  else: show/share CSP ──────▶
```

1. **Create.** Build + simulate + pin expiration + assemble (the build half of
   `createMultisigTransferRequest`), wrap into a CSP, then sign the creator's
   own entry (`signMultisigTransferEntry`'s signing half). Show/share the CSP.
2. **Approve (each member).** Import CSP → validate (below) → display summary →
   on approve, find this member's auth entry in the tx, sign it, append
   `{signerKey, authEntryXdr}`.
3. **Submit.** When `signatures.length >= threshold`, any holder splices the
   collected entries back into the tx and submits (the splice+submit half of
   `broadcastMultisigTransfer`). Soroban dedupes by nonce, so two concurrent
   submitters race harmlessly.

## Validation each signer MUST do before signing

- `network` matches `ACTIVE_NETWORK`.
- `smartAccountAddress` is a multisig **this device is a member of** (its rule
  holds a delegated signer that maps to one of my accounts — reuse
  `diagnoseAuthFailure`/`fetchDefaultContextRule`).
- Decode `unsignedTxXdr`; confirm the transfer's `from` == `smartAccountAddress`
  and render the real amount/asset/destination from the bytes.
- `expiresLedger` is still in the future (else the packet is dead — rebuild).
- An entry matching **my** account exists in the tx's `op.auth` (else I'm not a
  required signer for this tx).

## Code reuse — refactor, don't rewrite

The backend and P2P paths share ~all logic. Extract the backend-agnostic core
from `src/lib/multisig-send.ts` so both transports call it:

| Core function (extract) | Used by backend today | Used by P2P |
|---|---|---|
| `buildAssembledTransfer(params) → { unsignedTxXdr, expiresLedger }` | inside `createMultisigTransferRequest` | CSP create |
| `signEntryForMember(unsignedTxXdr, account, listIndex, mnemonic) → {signerKey, authEntryXdr}` | inside `signMultisigTransferEntry` | CSP approve |
| `spliceAndSubmit(unsignedTxXdr, entries[]) → { hash }` | inside `broadcastMultisigTransfer` | CSP submit |
| `aggregate/splice` | `soroban-auth-payload.ts` (unchanged) | same |

Then:
- **Backend transport** = `buildAssembledTransfer` → `createCosignRequest`;
  `signEntryForMember` → `addCosignSignature`; `getCosignRequest` →
  `spliceAndSubmit` → `markCosignSubmitted`.
- **P2P transport** = `buildAssembledTransfer` → CSP; `signEntryForMember` →
  append to CSP; `spliceAndSubmit` reading entries from CSP.

Net new P2P code is just: the CSP (de)serializer, the chunked-QR/file transport,
and 2–3 screens. The crypto is identical and already written.

## Screen mapping

- **Create → show**: after build, route to a "Share approval packet" screen
  (animated QR + Share button). New screen; reuses `pair-show-qr` rendering.
- **Receive → approve**: `pair-scan-qr` (scan) or a file-import handler →
  "Review & approve transfer" screen (summary + Approve) → re-show updated CSP
  or, if threshold met, a "Submit" CTA.
- The History "Pending" tab can list **locally held** CSPs (persist in-progress
  packets in SecureStore/AsyncStorage) so a member can resume.

## Security / edge cases

- **Replay:** the pinned nonce is consumed on submit; a re-shared CSP can't
  re-execute.
- **Tampering:** signatures bind the tx; altered bytes ⇒ invalid sigs. Always
  display from the decoded XDR.
- **Expiry:** `signatureExpirationLedger` caps the packet's lifetime; collect +
  submit before it; otherwise rebuild.
- **Sequence staleness:** the assembled tx pins the bundler's sequence number —
  same caveat as the backend path (§6j). Submit reasonably promptly.
- **Lost packet = lost pending tx** (no server copy) — by design; rebuild.

## Limitations vs. the backend

- **No async inbox / discovery.** Members must *receive* the packet; there's no
  "log in and see pending requests." Fine for small/co-located groups; the
  backend's inbox is better for "approve over days."
- **No server-side expiry sweep, audit, or notifications.**

## Coexistence

Because the core is transport-agnostic, P2P and backend are **not** mutually
exclusive. Ship P2P now to remove the server dependency; add the backend
transport later for async UX — same signing/submit code underneath. The CSP and
`CosignRequest` are the same shape, so a packet can even be uploaded to the
backend later if desired.

## Phased plan

1. ✅ **Refactor** `multisig-send.ts` into the three transport-agnostic core
   functions above (no behavior change; backend path keeps working). — done 2026-06-06
2. ✅ **CSP** type + (de)serializer + persistence (`src/lib/cosign-packet.ts`;
   AsyncStorage, not SecureStore — packets >2KB and hold no secrets) +
   `decodeTransferSummary` (derive display from the signed bytes). — done 2026-06-06
3. ✅ **Share transport** + import handler — `cosign-packet-flow.ts`
   (`createTransferPacket` / `approvePacket` / `submitPacket` / `importPacket`);
   export via RN `Share`, import via paste. — done 2026-06-06
4. ✅ **Approve screen** `app/cosign-review.tsx` (decode → summary → sign →
   append) + profile entry point "Approve Shared Transfer". — done 2026-06-06
5. ✅ **Submit** via `spliceAndSubmit` when threshold met (`submitPacket`). — done 2026-06-06
6. **Animated multi-part QR** transport (reuse pairing QR screens). ← deferred
7. Local "Pending" listing of held packets in History. ← deferred

Steps 1–5 = full backend-free loop (build → sign → share-as-text → import →
approve → submit). `send-token`'s multisig branch now routes here instead of the
backend cosign queue. Transport is share-as-text + paste for now; QR (6) and a
pending list (7) are polish. `cosign-auth.ts` (backend-transport token helper)
is now unused by the UI but kept for the backend transport.

⚠️ Still rides on the unverified delegated multi-entry auth tree (§6j) — the
loop is mechanically complete but a real on-chain submit is unconfirmed.

Prereq still shared with the backend path: the delegated **multi-entry auth
tree must be verified on testnet** (§6j) — P2P doesn't change the signing model,
only how entries are transported.
```
