# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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

Navigation entry logic: splash screen reads `@latch_onboarding_complete` from AsyncStorage; if absent, routes to onboarding; if present, routes to `/(tabs)/`.

### State Management

- **Local state** (`useState`) for ephemeral UI state
- **AsyncStorage** for persisted non-sensitive state (onboarding flag, theme preference)
- **expo-secure-store** for sensitive data (`ACCESS_TOKEN_KEY`, `REFRESH_TOKEN_KEY`)
- **React Query** (@tanstack/react-query) for server state/caching
- **Zustand** is installed but not yet used — available for global state when needed

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

### Path Aliases

`@/*` maps to the repo root. Import from `@/src/...`, `@/app/...`, etc.

### Key Libraries

| Purpose | Library |
|---|---|
| Animations | react-native-reanimated 4 |
| Forms | Formik + Yup |
| Debugging (dev only) | Reactotron |
| OTA updates | @hot-updater (Supabase + Cloudflare) |
| Icons | @expo/vector-icons (Ionicons) + @expo/symbols (SF Symbols) |
| Phone input | react-native-phone-number-input |
| Toasts | react-native-toast-message |

## Code Style

`.prettierrc`: single quotes, trailing commas, 100-char print width, 2-space tabs.
