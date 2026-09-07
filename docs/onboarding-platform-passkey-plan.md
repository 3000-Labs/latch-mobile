# Onboarding and Platform-Passkey Remediation Plan

Status: implementation in progress (slice 1 complete)  
Last updated: 2026-09-07  
Scope: mobile onboarding, passkey provisioning, local app unlock, deployment,
optional account recovery, and multisig onboarding

## Confirmed product decisions

1. `Create a New Wallet` must open the wallet-type chooser instead of going
   directly to biometric setup.
2. A newly created wallet must use a synced platform passkey. Device-only P-256
   credentials are not an onboarding fallback.
3. Device-only credentials may be reconsidered later together with session-key
   design. They are outside this change.
4. A Latch PIN is an app-unlock fallback only. It is not an on-chain signer and
   must never authorize a transaction.
5. Email registration, email OTP, recovery-password creation, and backup upload
   must be removed from mandatory onboarding.
6. Cloud recovery may be offered after onboarding as an optional, separate
   setup flow.
7. New-wallet creation must stop clearly on devices without platform-passkey
   support. It must not silently downgrade the credential.

## Target journeys

### Personal wallet

```text
Welcome
  -> Choose wallet type
  -> Personal wallet
  -> Explain and create platform passkey
  -> Set and confirm app-unlock PIN
  -> Deploy the smart account using that exact passkey
  -> Success
  -> Dashboard
```

### Multisig wallet

```text
Welcome
  -> Choose wallet type
  -> Multisig wallet
  -> Explain and create the creator's platform passkey
  -> Set and confirm app-unlock PIN
  -> Deploy the creator's personal smart account
  -> Name multisig and add members
  -> Choose approval threshold
  -> Review and deploy multisig
  -> Result
```

### Optional cloud recovery (post-onboarding)

```text
Settings/Profile
  -> Set up cloud recovery
  -> Email and OTP
  -> Create recovery password
  -> Encrypt and upload backup
  -> Confirm recovery is active
```

This optional journey is not required to complete the initial remediation, but
removing it from onboarding must not leave misleading recovery claims in the UI.

## Security invariants

These are release-blocking requirements, not UI preferences.

- A new wallet may be deployed only when its complete stored credential record
  is present and marked `PASSKEY_KIND === 'platform'`.
- Platform-passkey cancellation, unsupported-platform errors, provider errors,
  and relying-party configuration errors must stop onboarding.
- No onboarding or deployment error may invoke `createPasskeyCredential()` or
  persist a device-only private key as a fallback.
- Deployment must consume the credential established during enrollment. It must
  never generate or replace a signer.
- The credential ID, public key data, passkey kind, and relying-party metadata
  must be validated together. Checking only `CREDENTIAL_ID` is insufficient.
- Platform-passkey signing must continue to request OS user verification.
- Successful biometric or PIN app unlock must only reveal the application. It
  must not be treated as transaction authorization.
- A transaction requiring the passkey signer must invoke the platform-passkey
  assertion ceremony, regardless of how the app was unlocked.
- Existing mnemonic imports remain an explicitly separate Ed25519 flow. This
  project must not accidentally require a platform passkey as the signer for an
  imported mnemonic wallet without a separate product decision.
- Mainnet must not be used to validate these changes.

## Current-state issues

### ONB-1: Wallet chooser is bypassed

`app/onboarding.tsx` routes `Create a New Wallet` directly to
`/(auth)/biometric`. The intended `/(onboarding)/choose-wallet` route is
commented out, making multisig onboarding unreachable from the normal entry.

Acceptance criteria:

- The button opens `choose-wallet`.
- Personal selection enters personal passkey setup.
- Multisig selection carries an explicit shared-flow marker through personal
  signer setup and deployment.
- Back navigation does not leave stale flow parameters.

### PASSKEY-1: Provisioning silently creates a device-only signer

`src/lib/provision-passkey.ts` catches every platform ceremony failure and calls
`createPasskeyCredential()`. User cancellation is therefore converted into a
successful device-only wallet after a warning.

Acceptance criteria:

- Onboarding calls an API whose return type can only represent a platform
  credential.
- Unsupported platforms fail before any local credential is generated.
- A rejected platform ceremony preserves the failure and writes no credential.
- Cancellation is distinguishable from configuration/provider failure for UI
  copy, while both remain non-success outcomes.
- Existing local-key support, if retained for non-onboarding callers, is behind
  an explicit policy or separately named API and cannot be selected accidentally.

### PASSKEY-2: Existing credential checks are incomplete

`biometric.tsx` considers `CREDENTIAL_ID` alone sufficient. It does not require
`KEY_DATA_HEX`, `PASSKEY_KIND === 'platform'`, or matching RP metadata.

Acceptance criteria:

- A shared validator loads and validates the whole platform-credential record.
- Partial records fail closed.
- `kind=local` fails closed for new-wallet onboarding.
- Missing or mismatched RP metadata fails closed.
- No validation failure deletes or overwrites data automatically.

### PASSKEY-3: Deployment can create a different signer

`deploy-account.tsx` calls `getOrCreatePasskeyCredentials()` when stored values
are missing. That helper performs another ceremony and can fall back to a local
credential. Its preliminary biometric result is also ignored.

Acceptance criteria:

- Replace `getOrCreatePasskeyCredentials()` with a read/validate operation.
- Missing or invalid credentials display an actionable error and return the
  user to credential setup.
- Retry retries deployment with the same stored signer; it does not reprovision.
- Deployment receives the exact credential ID and key data approved during the
  enrollment screen.

### AUTH-1: Biometric preference is written but not honored

Setup writes `latch_biometric_enabled`, but unlock mode ignores it and prompts
whenever biometrics are enrolled. `Maybe Later` therefore does not persist the
choice it appears to make.

Acceptance criteria:

- Decide and document whether biometric app unlock is mandatory or optional.
- If optional, unlock reads and honors the stored preference.
- The setup copy distinguishes app unlock from the platform-passkey ceremony.
- Changing app-unlock preference cannot change the on-chain signer.

Product decision still required: whether PIN-first users should be offered a
biometric shortcut on the unlock keypad without first enabling it.

### AUTH-2: PIN scope and lockout need explicit treatment

The four-digit PIN hash is stored in SecureStore, but attempt count and the
30-second lockout exist only in React state and reset when the process restarts.

Acceptance criteria for this onboarding change:

- Copy consistently calls the PIN an app-unlock fallback.
- No signing function accepts PIN verification as authorization.
- PIN verification remains local and no PIN value is logged.
- The security implications of process-resettable lockout are documented.

Hardening persistent lockout, PIN length, hashing parameters, and device-bound
rate limiting should be handled in a dedicated follow-up after threat modeling;
none should be weakened merely to simplify onboarding.

### RECOVERY-1: Recovery setup is mandatory during onboarding

After PIN confirmation, `set-pin.tsx` routes through email registration, OTP,
and recovery-password creation before deployment.

Acceptance criteria:

- New personal and multisig flows go from PIN completion to deployment.
- No email access token or recovery-password session is required for deployment.
- Existing email-recovery entry remains available only if it is still supported
  for previously backed-up wallets.
- UI does not imply that cloud recovery was enabled when it was skipped.

### RECOVERY-2: Deployment assumes an onboarding backup session

`deploy-account.tsx` calls `uploadBackup()` for personal onboarding, while the
multisig path defers the same call to `shared-wallet-review.tsx`. Both set
`BACKUP_PENDING` when upload fails.

Acceptance criteria:

- Initial personal deployment does not upload a backup or set `BACKUP_PENDING`.
- Initial multisig deployment does not upload a backup or set
  `BACKUP_PENDING`.
- Existing post-onboarding recovery setup owns backup upload and retry state.
- Re-anchor and restore flows are reviewed separately so removing onboarding
  calls does not break already-enrolled users.

### COPY-1: Passkey and biometric claims are conflated

The current UI calls the setup “biometrics,” while the wallet signer is the
platform passkey. Comments also imply that discoverable credentials necessarily
sync and that all providers store keys in a particular hardware component.

Acceptance criteria:

- Enrollment copy leads with creation of a platform passkey.
- Biometric/app-unlock copy is separate.
- Copy states that passkey availability across devices depends on the user's OS
  passkey provider/account configuration.
- Do not claim that Latch reads biometric data.
- Technical comments distinguish OS user verification from app-level biometric
  prompts and avoid guarantees the API cannot establish.

## First implementation slice: platform-only provisioning boundary

The first slice should change no routes and deploy no accounts. Its purpose is
to establish an API that cannot return a local credential.

### Proposed API boundary

Prefer a separately named function over a boolean whose meaning is easy to
invert:

```ts
provisionPlatformPasskeyAtIndex(
  listIndex: number,
  options?: { displayName?: string },
): Promise<ProvisionedPlatformPasskey>
```

`ProvisionedPlatformPasskey` should have a literal `kind: 'platform'`. The
function should:

1. Check `isPlatformPasskeySupported()`.
2. Throw a typed/identifiable unsupported error when false.
3. Run `createPlatformPasskeyCredential()` once.
4. Store it with `storePlatformPasskeyCredentialAtIndex()` only after creation
   succeeds.
5. Return only the stored platform credential.
6. Preserve and report useful native error context without generating a local
   key or logging key material.

The existing fallback-capable function can temporarily remain for callers that
have not yet migrated, but onboarding and deployment must stop calling it. A
later cleanup can remove local provisioning after all call sites are classified.

### Tests to write first

Extend `src/lib/__tests__/provision-passkey.test.ts` with a dedicated
`provisionPlatformPasskeyAtIndex` suite:

1. **Success:** stores the platform credential at the requested index and
   returns `kind=platform`.
2. **Unsupported device:** rejects with a recognizable unsupported error,
   does not call the OS ceremony, and does not create/store a local credential.
3. **User cancellation:** rejects, stores nothing, and does not create a local
   credential.
4. **Provider/configuration failure:** rejects with useful context, stores
   nothing, and does not create a local credential.
5. **Storage failure:** rejects and never reports provisioning success.
6. **No secret logging:** failure handling does not log credential IDs, public
   key data, private keys, signatures, or their prefixes/lengths.

The old fallback tests should remain initially because they describe the legacy
API. They should be deleted only when that API and all authorized legacy uses
are removed—not changed to pass under a new meaning.

### Definition of done for the first slice

- New platform-only tests fail against the old behavior and pass with the new
  API.
- The API cannot return `kind=local` by type or runtime behavior.
- No onboarding route uses the new API yet; this keeps the first review focused.
- `bun run lint`, `bun run typecheck`, and the relevant Jest project pass.
- No physical-device passkey ceremony or live-network behavior is claimed as
  verified.

## Implementation sequence

- [x] Slice 1: Add platform-only provisioning API and unit tests.
- [ ] Slice 2: Add complete stored-platform-credential validator and tests.
- [ ] Slice 3: Make deployment validation-only; remove signer reprovisioning.
- [ ] Slice 4: Refactor setup screen around platform-passkey enrollment.
- [ ] Slice 5: Separate and correctly honor biometric app-unlock preference.
- [ ] Slice 6: Audit signing call sites to prove PIN/biometric app unlock cannot
      substitute for a platform assertion.
- [ ] Slice 7: Restore wallet chooser routing for personal and multisig paths.
- [ ] Slice 8: Skip mandatory recovery setup after PIN confirmation.
- [ ] Slice 9: Remove onboarding backup upload and pending-backup state.
- [ ] Slice 10: Update copy, comments, recovery affordances, and documentation.
- [ ] Slice 11: Run full verification and perform physical iOS/Android passkey
      tests on testnet with published/non-secret fixtures only.

## Verification matrix

| Scenario | Expected result |
| --- | --- |
| iOS with configured platform-passkey provider | Enrollment can continue |
| Android with configured platform-passkey provider | Enrollment can continue |
| Platform passkeys unsupported | Creation blocked; no local key written |
| User cancels system passkey sheet | Remain in setup; no local key written |
| RP/associated-domain misconfiguration | Actionable failure; no fallback |
| Partial SecureStore credential | Deployment blocked |
| Stored `PASSKEY_KIND=local` | New-wallet deployment blocked |
| Platform credential succeeds, deployment fails | Retry same signer |
| App unlocked with PIN | Signing still opens platform-passkey ceremony |
| Personal onboarding without email | Account can deploy; no backup claimed |
| Multisig onboarding without email | Personal signer and multisig can deploy;
  no backup claimed |

## Review and sign-off checkpoints

Human review is required before merging changes to:

- `src/lib/passkey-webauthn.ts`
- `src/lib/provision-passkey.ts`
- `app/(auth)/biometric.tsx`
- `app/(onboarding)/deploy-account.tsx`
- `src/store/wallet.ts`
- passkey signing or transaction-relay call sites

For each slice, record what was verified by automated tests and what remains
unverified on physical devices and testnet. Mainnet validation is out of scope.
