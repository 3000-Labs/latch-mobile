# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
bun install

# Start Expo dev server
bun start

# Run on specific platform
bun run ios
bun run android
bun run web

# Lint
bun run lint
```

This project uses **Bun** as the package manager (not npm/yarn).

## App Overview

Latch is a **Stellar blockchain mobile wallet** built with React Native and Expo. It lets users create new wallets (12-word BIP-39 mnemonic, SEP-0005 compliant), import existing wallets via recovery phrase, or connect an external Stellar wallet. Core features: biometric auth (Face ID/Touch ID), 4-digit PIN, and OTA updates via hot-updater.

## Architecture

### Routing

File-based routing via **Expo Router** (similar to Next.js):

```
app/
├── index.tsx              # Animated splash screen; checks AsyncStorage for onboarding state
├── _layout.tsx            # Root layout — wraps all screens with ThemeProvider, QueryClientProvider, Icons
├── onboarding.tsx         # 3-slide intro carousel
├── (auth)/                # Biometric setup, success screen
├── (onboarding)/          # Wallet creation/import flows (get-started → set-pin → recovery-phrase → verify)
└── (tabs)/                # Authenticated shell with custom bottom tab bar
```

Navigation entry logic: splash screen reads `SECURE_KEYS.SMART_ACCOUNT` from SecureStore; if present, routes to `/(auth)/biometric` with `mode: 'unlock'`; if absent, routes to `/onboarding`.

### State Management

- **Local state** (`useState`) for ephemeral UI state
- **AsyncStorage** for persisted non-sensitive state (theme preference)
- **expo-secure-store** for all sensitive data — see `SECURE_KEYS` in `src/store/wallet.ts` for the full key inventory
- **React Query** (@tanstack/react-query) for server state/caching
- **Zustand** (`useWalletStore` in `src/store/wallet.ts`) — primary global state for the active wallet, accounts list, mnemonic, and smart account address. Handles multi-account derivation, rehydration from SecureStore on launch, and full reset on logout.

### API Layer

`src/api/client.ts` — Axios instance with:

- Automatic Bearer token injection from Secure Store
- 401 → token refresh → retry queue pattern
- Base URL from `EXPO_PUBLIC_API_BASE_URL` env var

### Stellar Integration

- `@stellar/stellar-sdk` — core blockchain SDK
- `@stellar/freighter-api` — connect existing Freighter wallet
- `stellar-hd-wallet` — BIP-39/SEP-0005 mnemonic wallet generation
- `src/lib/seed-wallet.ts` — helpers for generating and restoring Stellar keypairs from mnemonics
- `src/api/smart-account.ts` — deploys Soroban smart accounts via the factory contract (Ed25519 and G-address paths)
- `src/api/passkey.ts` — deploys smart accounts for passkey (P-256 / WebAuthn) users
- `src/lib/passkey-webauthn.ts` — custom WebAuthn implementation using `react-native-quick-crypto` and `expo-secure-store` with biometric access control (no browser APIs)

**Network switching:** `ACTIVE_NETWORK` in `src/constants/config.ts` is the single constant that moves the whole app between testnet and mainnet.

**Android XHR workaround:** All Soroban RPC calls use raw `XMLHttpRequest` instead of Axios. The Stellar SDK's Axios transport fails on Android because it bypasses the platform TLS stack. Using XHR routes through OkHttp and respects `network_security_config.xml`.

**Wallet account model** (`WalletAccount` in `src/store/wallet.ts`):

- Mnemonic users: BIP-44 index ≥ 0, `gAddress` and `publicKeyHex` populated
- Passkey users: index = -1 (first account) or negative, `gAddress` is empty, `credentialId` identifies the P-256 key in SecureStore

**Smart account factory:** requires `EXPO_PUBLIC_FACTORY_ADDRESS` and `EXPO_PUBLIC_BUNDLER_SECRET`. The bundler signs deployment transactions — move server-side before production (see security note in `smart-account.ts`).

### Theme & UI

- **@shopify/restyle** — type-safe styling primitives; `Box` and `Text` are the base layout/typography components
- **@ui-kitten/components** + **@eva-design/eva** — pre-built component library
- `src/theme/theme.ts` — color palette, spacing scale, typography definitions
- `src/theme/ThemeContext.tsx` — light/dark/system theme provider; preference persisted in AsyncStorage
- Shared components live in `src/components/shared/` (Button, Input, Checkbox, Card, etc.)

### Environment Configuration

`env.js` uses **Zod** to validate all environment variables at build time. Variables prefixed `EXPO_PUBLIC_*` are baked into the bundle. Key vars:

- `EXPO_PUBLIC_APP_ENV` — controls app name and bundle IDs (staging vs production)
- `EXPO_PUBLIC_API_BASE_URL` — backend API
- `EXPO_PUBLIC_HOT_UPDATER_*` — Supabase config for OTA updates

`app.config.js` reads from `env.js` and conditionally applies staging vs production icons, bundle IDs, and app names.

Additional required vars:

- `EXPO_PUBLIC_SOROBAN_RPC_URL` — Soroban JSON-RPC endpoint (separate from Horizon)
- `EXPO_PUBLIC_FACTORY_ADDRESS` — on-chain smart account factory contract address
- `EXPO_PUBLIC_BUNDLER_SECRET` — Stellar secret key for the bundler account that funds + signs deployments (testnet only; must move server-side for production)

### Path Aliases

`@/*` maps to the repo root. Import from `@/src/...`, `@/app/...`, etc.

### Key Libraries

| Purpose              | Library                                                    |
| -------------------- | ---------------------------------------------------------- |
| Animations           | react-native-reanimated 4                                  |
| Forms                | Formik + Yup                                               |
| Debugging (dev only) | Reactotron                                                 |
| OTA updates          | @hot-updater (Supabase + Cloudflare)                       |
| Icons                | @expo/vector-icons (Ionicons) + @expo/symbols (SF Symbols) |
| Phone input          | react-native-phone-number-input                            |
| Toasts               | react-native-toast-message                                 |

## Code Style

`.prettierrc`: single quotes, trailing commas, 100-char print width, 2-space tabs.

## Claude Code Workflow

### Before Making Changes

- Read the target file before editing — never assume structure from context alone
- For anything touching Stellar/Soroban: check `src/constants/config.ts` for network (testnet vs mainnet) context first
- For UI: confirm the component uses `Box`/`Text` from `@shopify/restyle`, not `View`/`Text` from `react-native`
- Check `src/components/shared/` before creating a new component — the shared one likely exists
- If you spot pre-existing dead code or style issues outside your change scope, leave them — only remove code your specific change renders obsolete

### Mandatory Patterns (never deviate)

- **Forms:** Formik + Yup always. No `useState` for form field state.
- **Sensitive data:** `expo-secure-store` via `SECURE_KEYS` in `src/store/wallet.ts`. Never AsyncStorage for keys/mnemonics/tokens.
- **Soroban RPC calls:** Raw `XMLHttpRequest` only — not Axios. Axios bypasses Android TLS stack (OkHttp). Follow the pattern in `src/api/smart-account.ts`.
- **Layout primitives:** `Box` (not `View`), `Text` from restyle (not RN `Text`).
- **State:** `useWalletStore` (Zustand) for wallet/account global state; React Query for server/async state; `useState` for ephemeral local UI only.

### Task Execution Order

0. **Define success criteria** — state what "done" looks like before touching code. If the request is ambiguous, surface interpretations and confirm; don't choose silently.
1. Read all files relevant to the task
2. Make the minimal change that satisfies the requirement — no refactoring beyond scope
3. Run `bun run lint` to catch issues
4. If lint passes and the criteria from step 0 are met, stop. Report: what changed and what's next (one or two sentences)

### Common Pitfalls to Avoid

- Do not add Axios calls for Soroban RPC — use XHR
- Do not import from `react-native` for layout (Box/Text are the primitives)
- Do not store sensitive data in AsyncStorage
- Do not use `npm` or `yarn` — this project uses `bun`
- Do not add comments explaining what the code does; only add comments for non-obvious WHY

### Lint Before Reporting Done

Always run `bun run lint` after code changes before telling the user the task is complete.

## Reference Projects

The `reference/` folder contains three projects to consult for testnet/mainnet and Stellar tasks. Always read the relevant reference file before implementing — do not rely on training knowledge alone.

### When to use each

| Task type                                       | Consult first                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| Testnet RPC calls, network config               | `reference/stellar-dev-skill/skill/api-rpc-horizon.md`                        |
| Testing strategy (unit / testnet / mainnet)     | `reference/stellar-dev-skill/skill/testing.md`                                |
| Soroban contract interactions                   | `reference/stellar-dev-skill/skill/contracts-soroban.md`                      |
| Stellar asset handling (SAC, native, custom)    | `reference/stellar-dev-skill/skill/stellar-assets.md`                         |
| Frontend SDK usage (transactions, signing)      | `reference/stellar-dev-skill/skill/frontend-stellar-sdk.md`                   |
| Security patterns / audit checklist             | `reference/stellar-dev-skill/skill/security.md`                               |
| SEP standards (SEP-0005, SEP-0007, etc.)        | `reference/stellar-dev-skill/skill/standards-reference.md`                    |
| Unexpected errors / strange behaviour           | `reference/stellar-dev-skill/skill/common-pitfalls.md`                        |
| Real-world RN wallet patterns (services, hooks) | `reference/freighter-mobile/src/services/stellar.ts`, `transactionService.ts` |
| Testnet friendbot / account funding             | `reference/freighter-mobile/src/services/friendbot.ts`                        |
| Freighter API integration                       | `reference/freighter/@stellar/freighter-api`                                  |

### Rule

For any task involving testnet, mainnet, Soroban RPC, transaction building, asset transfers, or network switching — read `reference/LATCH_REFERENCE.md` first (quick-reference tables + Latch-specific patterns). Fall back to the individual files in the table above for deeper detail.
