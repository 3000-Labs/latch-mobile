# Smart Account Deployment — Debug & Fix Log

**Branch:** `creation-stage`  
**Date:** 2026-04-30  
**Files changed:** `src/api/smart-account.ts`, `src/api/passkey.ts`, `src/lib/passkey-webauthn.ts`

---

## Overview

Three separate bugs were discovered and fixed during smart account deployment testing across the Ed25519 (seed wallet) path and the WebAuthn/passkey (biometric) path.

---

## Bug 1 — XDR Buffer Overflow in `parseSimResult`

### File
`src/api/smart-account.ts` — `parseSimResult()`, line 93

### Symptom
```
TypeError: XDR Read Error: attempt to read outside the boundary of the buffer
```
Thrown at `xdr.ScVal.fromXDR(raw.results?.[0]?.retval ?? 'AAAAAA==', 'base64')`.

### Root Cause
The Soroban RPC `simulateTransaction` response can return `retval` as an **empty string** `""` rather than `null` or `undefined` when the contract function has no meaningful return value at simulation time.

The nullish coalescing operator `??` only guards against `null` and `undefined`. An empty string `""` passes through and is decoded from base64 to a zero-length buffer. When the XDR parser then tries to read the type discriminator from that buffer, it has nothing to read — hence the boundary error.

```ts
// Before — ?? does not catch empty string ""
retval: xdr.ScVal.fromXDR(raw.results?.[0]?.retval ?? 'AAAAAA==', 'base64'),

// After — || catches any falsy value including ""
retval: xdr.ScVal.fromXDR(raw.results?.[0]?.retval || 'AAAAAA==', 'base64'),
```

`'AAAAAA=='` is the base64 encoding of 4 zero bytes, which XDR reads as `ScVal.scvVoid()` — a safe no-op fallback.

### Additional hardening
Wrapped the `fromXDR` call in a `try/catch` returning `xdr.ScVal.scvVoid()` on any parse failure:

```ts
retval: (() => {
  try {
    return xdr.ScVal.fromXDR(raw.results?.[0]?.retval || 'AAAAAA==', 'base64');
  } catch {
    return xdr.ScVal.scvVoid();
  }
})(),
```

The same `??` → `||` fix was applied to the `predictAddress` function which has an identical pattern.

---

## Bug 2 — Smart Account Address Not Extracted After Deployment

### File
`src/api/smart-account.ts` — polling loop, ~line 315–344

### Symptom
```
LOG  Deployment successful via factory:
```
Deployment succeeded but `smartAccountAddress` was logged as an empty string.

### Root Cause — Wrong Field Name (`returnValue`)
The polling code read `poll.returnValue` from the `getTransaction` RPC response:

```ts
returnValueXdr = poll.returnValue;  // undefined — this field does not exist
```

The Soroban RPC `getTransaction` response does **not** have a `returnValue` field. The transaction result is stored in `poll.resultMetaXdr` (a base64-encoded `TransactionMeta` XDR blob). Because `returnValue` was `undefined`, the address extraction block was skipped entirely and `smartAccountAddress` stayed as `""`.

```ts
// Before
returnValueXdr = poll.returnValue;

// After
returnValueXdr = poll.resultMetaXdr;
```

### Root Cause — Wrong Protocol Version (`v3` vs `v4`)
After fixing the field name, a second error appeared:

```
WARN  Could not parse smartAccountAddress from resultMetaXdr: [TypeError: v3 not set]
LOG   {"meta": {"_arm": "v4", ...}}
```

The code called `meta.v3().sorobanMeta()` but the testnet is on **Protocol 22**, which uses `TransactionMeta.v4`. The `v3()` accessor throws when the discriminant is `v4`.

### Fix — `extractAddressFromMeta` helper

A shared helper was added that inspects `meta.arm()` and dispatches to the correct version:

```ts
function extractAddressFromMeta(resultMetaXdr: string): string | undefined {
  try {
    const meta = xdr.TransactionMeta.fromXDR(resultMetaXdr, 'base64');
    const arm = (meta as any).arm();
    let sorobanMeta: any;
    if (arm === 'v3') sorobanMeta = meta.v3().sorobanMeta();
    else if (arm === 'v4') sorobanMeta = (meta as any).v4().sorobanMeta();
    if (sorobanMeta) return scValToNative(sorobanMeta.returnValue());
  } catch (e) {
    console.warn('Could not parse address from resultMetaXdr:', e);
  }
  return undefined;
}
```

This helper is used in both the Ed25519 deployment polling loop and the Freighter/G-address deployment polling loop. The second loop also had the `poll.returnValue` bug and was fixed identically.

---

## Bug 3 — Passkey Deployment Fails on Android (`status=0, readyState=4`)

### File
`src/api/passkey.ts` — `deploySmartAccount()`

### Symptom
```
ERROR  [network error] status=0, readyState=4
```
The passkey deployment failed immediately on Android. The Ed25519 path (`smart-account.ts`) deployed successfully on the same device.

### Root Cause — Extra `predictAddress` XHR Call

`passkey.ts`'s `deploySmartAccount` called `predictAddress()` **before** the actual deployment:

```ts
// passkey.ts — old flow
const predictedAddress = await predictAddress(rpcUrl, networkPassphrase, factoryAddress, paramsMap);
//   ↑ calls sorobanCall('simulateTransaction') for get_account_address — FAILS HERE on Android
const bundlerAccount = await getAccount(horizonUrl, bundlerKeypair.publicKey());
// ... never reached
```

`predictAddress` made a `simulateTransaction` XHR call for the `get_account_address` factory function. This was the **first** network call in the passkey deploy flow and it failed on Android with `status=0` (OkHttp connection failure to `soroban-testnet.stellar.org`) before the actual deployment transaction was ever attempted.

The Ed25519 path in `smart-account.ts` does **not** call `predictAddress` during deployment — it goes straight to building and simulating the `create_account` transaction. This is why the Ed25519 path worked while the passkey path did not.

The `status=0, readyState=4` combination from Android's OkHttp HTTP client indicates the TCP connection completed its teardown (`readyState=4`) but never received any HTTP response (`status=0`). This is characteristic of a TLS handshake or early connection reset at the OS level. The extra `predictAddress` call was the only difference in the number of Soroban calls between the two paths.

### Fix — Match the Working Ed25519 Deploy Pattern

Rewrote `passkey.ts` to follow the same flow as `smart-account.ts`:

**Old flow (passkey.ts):**
1. `predictAddress` → `sorobanCall('simulateTransaction', get_account_address)` ← FAILS
2. `getAccount` (Horizon)
3. `sorobanCall('simulateTransaction', create_account)`
4. assemble + sign + `sorobanCall('sendTransaction')`
5. poll `sorobanCall('getTransaction')` + compare vs predicted address

**New flow (passkey.ts):**
1. `getBundlerAccount` via native `fetch` to Horizon ← no XHR, works on Android
2. `sorobanCall('simulateTransaction', create_account)` ← first and only Soroban call
3. assemble + sign + `sorobanCall('sendTransaction')`
4. poll `sorobanCall('getTransaction')` + `extractAddressFromMeta` (v3/v4 safe)

The address is now read from `resultMetaXdr` after the transaction settles (same as the Ed25519 path), removing any need for a pre-deployment address prediction call.

### Additional Change — `lookupSmartAccount` No Longer Makes Network Calls

The old `lookupSmartAccount` in `passkey.ts` called `predictAddress` to derive the contract address before checking `getLedgerEntries` — again triggering the failing XHR. Since `lookupSmartAccount` from `passkey.ts` is not called anywhere in the app, and the deployed address is already persisted to `SecureStore` by `deploy-account.tsx`, the new implementation simply reads from `SecureStore`:

```ts
export async function lookupSmartAccount(
  credentialId: string,
  keyDataHex: string,
): Promise<LookupResult> {
  const stored = await SecureStore.getItemAsync(SECURE_KEYS.SMART_ACCOUNT);
  if (stored) return { deployed: true, smartAccountAddress: stored };
  return { deployed: false, smartAccountAddress: '' };
}
```

---

## Bug 4 — `storePasskeyCredential` Ignored `requireAuthentication` for PIN-Only Users

### File
`src/lib/passkey-webauthn.ts` — `storePasskeyCredential()`

### Symptom
Silent data loss — no runtime error. PIN-only users (who skipped biometric setup) had their passkey private key stored with `requireAuthentication: true` despite the call from `biometric.tsx` passing `false` as a second argument.

### Root Cause
The function signature accepted only one parameter, so the second argument was silently discarded:

```ts
// biometric.tsx (PIN-only path)
await storePasskeyCredential(credential, false);  // false was ignored

// passkey-webauthn.ts — old signature
export async function storePasskeyCredential(credential: PasskeyCredential): Promise<void> {
  // always stored with requireAuthentication: true regardless of caller intent
  await SecureStore.setItemAsync(SECURE_KEYS.PASSKEY_PRIVATE_KEY, credential.privateKeyHex, {
    requireAuthentication: true,
    ...
  });
}
```

On Android, a key stored with `requireAuthentication: true` requires biometric hardware to read. A PIN-only user with no enrolled biometrics would be permanently locked out of signing operations.

### Fix

```ts
export async function storePasskeyCredential(
  credential: PasskeyCredential,
  requireBiometric = true,
): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEYS.CREDENTIAL_ID, credential.credentialId);
  await SecureStore.setItemAsync(SECURE_KEYS.KEY_DATA_HEX, credential.keyDataHex);

  await SecureStore.setItemAsync(SECURE_KEYS.PASSKEY_PRIVATE_KEY, credential.privateKeyHex, {
    requireAuthentication: requireBiometric,
    authenticationPrompt: 'Authenticate to access your Latch wallet',
  });
}
```

---

## Summary Table

| Bug | File | Root Cause | Fix |
|-----|------|-----------|-----|
| XDR buffer overflow on `retval` | `smart-account.ts` | `??` doesn't catch empty string `""` from RPC | Changed to `\|\|`; added try/catch fallback to `scvVoid()` |
| Deployed address always empty | `smart-account.ts` | `poll.returnValue` doesn't exist; should be `poll.resultMetaXdr` | Fixed field name + added `extractAddressFromMeta` helper |
| Protocol 22 meta parse error | `smart-account.ts` | `meta.v3()` throws on Protocol 22 (v4) transactions | Added `arm()` check, dispatch to `.v3()` or `.v4()` |
| Android passkey deploy `status=0` | `passkey.ts` | `predictAddress` made an extra XHR call before deployment; that call failed on Android | Removed `predictAddress` from deploy path; address read from settled `resultMetaXdr` |
| PIN users biometric-locked out | `passkey-webauthn.ts` | `storePasskeyCredential` ignored the `requireAuthentication=false` argument | Added `requireBiometric = true` parameter to the function signature |
