# Latch Mobile — Platform Divergence Roadmap (iOS vs Android)

## Purpose

React Native lets us share most of the Latch mobile app across iOS and Android using one TypeScript codebase and `@stellar/stellar-sdk`.

However, there are a few areas where the platforms will diverge and require platform-specific implementation work. This page turns those differences into explicit roadmap actions so they are planned early instead of becoming hidden blockers later.

## What stays shared

These areas should remain shared in React Native / TypeScript across both iOS and Android:

- wallet UI and navigation
- onboarding flow and product logic
- Horizon queries
- Soroban RPC queries
- transaction assembly and XDR handling
- smart-account auth-entry construction
- bridge status polling and receive flow UI
- integration with backend orchestration services

## Where the platforms diverge

The app will diverge only where the mobile operating systems expose different security and identity capabilities.

### 1. Passkeys and biometric authentication

This is the first major divergence.

On iOS, passkey flows are built around Apple authentication APIs.

On Android, passkey flows are built around Credential Manager / platform WebAuthn APIs.

This affects:

- passkey registration
- passkey authentication
- biometric prompts
- error handling
- lifecycle edge cases
- account recovery and re-enrollment UX

### 2. Hardware-backed key management

This is the second major divergence.

On iOS, hardware-backed signing typically relies on Secure Enclave.

On Android, it relies on Android Keystore.

This affects:

- key generation
- key storage
- signing callbacks
- biometric gating
- device binding behavior
- exportability and recovery constraints

### 3. Secure local storage

Even when the Stellar logic is shared, the secure storage primitives are platform-specific.

This affects:

- encrypted seed or signer metadata storage
- token/session storage
- backup and restore behavior
- device migration behavior
- how account state is rehydrated on reinstall

### 4. Native crypto performance and APIs

Some cryptographic support will need native help for performance or security.

This affects:

- hashing performance
- signing performance
- compatibility with hardware-backed keys
- native module integration for secure signing

### 5. Deep links, app links, and signing handoff UX

Latch will likely need signing and callback flows that interact with browsers, dApps, QR flows, or external links.

This affects:

- deep link registration
- universal links / app links
- return-to-dApp flow behavior
- transaction approval entry points
- edge cases when the app is backgrounded or reopened

### 6. Push notifications and bridge/deposit state

If Latch later adds deposit alerts, transaction completion alerts, or permission notifications, platform messaging behavior will diverge.

This affects:

- push registration
- notification permissions
- background handling
- notification tap routing

## Roadmap Actions

## Phase A — Architecture decisions

### Action A1 — Decide signer strategy for mobile

We need to decide which signer models Latch Mobile will support first:

- passkey / P-256 first
- classic ed25519 key first
- both, with different security tiers

Why this matters:

This decision shapes native module needs, contract verifier priorities, onboarding UX, and recovery design.

Output:

A written decision on the first supported signer model for mobile MVP.

### Action A2 — Decide recovery model before mainnet planning

Device-bound keys create a recovery problem.

We need an explicit recovery design for mobile signers, such as:

- backup key during onboarding
- guardian or social recovery
- secondary device enrollment
- server-assisted recovery with clearly stated trust assumptions

Why this matters:

Without a recovery model, hardware-bound keys become a product risk.

Output:

A recovery design decision with security assumptions documented.

## Phase B — Native capability planning

### Action B1 — Define passkey integration plan for iOS and Android

We need to specify:

- the exact native APIs to use on each platform
- the React Native bridge strategy
- expected user flows for registration and sign-in
- failure and fallback states

Output:

A technical design for passkey support on both platforms.

### Action B2 — Define hardware-backed signing module strategy

We need to decide:

- whether to use an existing React Native package or build a thin custom module
- which curves and key types are supported on each platform
- how the JS app passes payloads to native signing code
- how signatures are returned and verified inside the smart-account flow

Output:

A native signing module plan with package choice or build decision.

### Action B3 — Define secure storage policy

We need a platform-aware storage policy for:

- signer metadata
- session state
- recovery metadata
- cached account data
- secrets that must never be exposed to plain JS storage

Output:

A mobile storage policy document.

## Phase C — Product and protocol integration

### Action C1 — Map mobile signer choices to contract/verifier roadmap

If mobile uses passkeys or P-256 hardware-backed keys, contract support must align.

We need to map:

- current web demo signer model
- mobile signer model
- required verifier contracts
- smart-account auth expectations
- migration path from MVP signer support to broader multi-signer support

Output:

A signer-to-verifier roadmap connecting mobile and contracts work.

### Action C2 — Design mobile onboarding around platform realities

The onboarding flow must reflect the actual signer and recovery constraints.

We need to design for:

- create signer
- backup or recovery setup
- deploy smart account
- fund via bridge instructions
- first successful transaction

Output:

A mobile onboarding spec that matches the selected signer model.

### Action C3 — Design dApp/deep-link signing flow

If Latch becomes a signing wallet for dApps, we need a mobile flow for:

- opening from a deep link
- displaying transaction details
- signing with biometrics or passkey
- returning to the dApp safely

Output:

A mobile signing handoff flow spec.

## Phase D — Engineering implementation work

### Action D1 — Build shared React Native wallet core

This should stay shared across iOS and Android:

- `@stellar/stellar-sdk` integration
- Horizon and Soroban clients
- account reads
- contract reads
- transaction assembly
- smart-account auth-entry preparation
- backend orchestration integration

Output:

A shared mobile core package or app module.

### Action D2 — Implement iOS native security layer

Build or integrate the iOS-specific pieces for:

- Secure Enclave or passkey support
- biometric prompts
- secure storage integration
- signing callback bridge into the React Native layer

Output:

Working iOS native security bridge.

### Action D3 — Implement Android native security layer

Build or integrate the Android-specific pieces for:

- Keystore or Credential Manager support
- biometric prompts
- secure storage integration
- signing callback bridge into the React Native layer

Output:

Working Android native security bridge.

### Action D4 — Add backend orchestration endpoints required by mobile

Mobile should not own the heaviest protocol complexity.

We should expose backend endpoints for:

- simulation-heavy transaction preparation
- sponsorship / fee bump flows
- bridge status updates
- smart-account deployment or orchestration where appropriate

Output:

Mobile-oriented backend API surface.

## Immediate backlog recommendations

These are the first concrete roadmap items I would add now:

1. Decide the mobile MVP signer model.
2. Decide the recovery model for device-bound keys.
3. Specify passkey and hardware-key support for iOS and Android.
4. Map signer choice to verifier-contract requirements.
5. Build the shared React Native wallet core on `@stellar/stellar-sdk`.
6. Implement iOS native signing/security bridge.
7. Implement Android native signing/security bridge.
8. Add backend endpoints needed for sponsorship and orchestration.
9. Design onboarding and signing UX around these platform constraints.

## Recommended owner mapping

- Founder / Tech Lead: signer strategy, recovery strategy, verifier alignment
- Mobile Dev: RN core, native security bridge recommendations, platform feasibility
- Smart Contract Dev: verifier support and smart-account compatibility
- PM: timeline, task tracking, dependency management, decision follow-through
- Designer / Product: onboarding, recovery, biometric, and signing UX

## Why this matters

The important takeaway is that React Native is not the problem. The shared app layer is fine.

The real divergence comes from security, identity, and recovery.

Those are the areas we need to plan deliberately as part of the Latch roadmap.
