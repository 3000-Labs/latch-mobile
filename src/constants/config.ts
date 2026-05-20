import { Networks } from '@stellar/stellar-sdk';

// ─── Backend API ──────────────────────────────────────────────────────────────
// EXPO_PUBLIC_API_BASE_URL is the Latch Next.js backend.
// EXPO_PUBLIC_SOROBAN_RPC_URL is the Soroban JSON-RPC endpoint — different host.
const LATCH_BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// ─── Stellar / Soroban ────────────────────────────────────────────────────────
const STELLAR_AUTH_PREFIX = 'Stellar Smart Account Auth:\n';

// ─── Network configuration ────────────────────────────────────────────────────
export interface NetworkDetails {
  network: 'TESTNET' | 'PUBLIC';
  networkName: string;
  horizonUrl: string;
  networkPassphrase: string;
  sorobanRpcUrl: string;
  friendbotUrl?: string;
}

export const TESTNET_NETWORK: NetworkDetails = {
  network: 'TESTNET',
  networkName: 'Test Net',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  networkPassphrase: Networks.TESTNET,
  sorobanRpcUrl: process.env.EXPO_PUBLIC_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org',
  friendbotUrl: 'https://friendbot.stellar.org',
};

export const MAINNET_NETWORK: NetworkDetails = {
  network: 'PUBLIC',
  networkName: 'Main Net',
  horizonUrl: 'https://horizon.stellar.org',
  networkPassphrase: Networks.PUBLIC,
  sorobanRpcUrl: 'https://mainnet.sorobanrpc.com',
};

// Active network — switch this one constant to move the whole app between networks.
export const ACTIVE_NETWORK: NetworkDetails = TESTNET_NETWORK;

// Convenience shortcuts derived from the active network
const HORIZON_URL = ACTIVE_NETWORK.horizonUrl;
const STELLAR_NETWORK_PASSPHRASE = ACTIVE_NETWORK.networkPassphrase;
const STELLAR_RPC_URL = ACTIVE_NETWORK.sorobanRpcUrl;
const STELLAR_VERIFIER_ADDRESS =
  process.env.EXPO_PUBLIC_VERIFIER_ADDRESS ??
  'CCRB63MFFBYXBZCRLRGLJVTHC7O4SUGAYTO5ZZEUNVY5W5DVGKHETI67';

// Minimum XLM reserve per Stellar protocol:
//   (BASE_RESERVE_MIN_COUNT + subentry_count + num_sponsoring - num_sponsored) × BASE_RESERVE
export const BASE_RESERVE = 0.5;
export const BASE_RESERVE_MIN_COUNT = 2;

// Relying party ID used when constructing WebAuthn authenticatorData for passkey signing.
// Must be a stable domain string — the on-chain verifier checks signature math, not this value.
const PASSKEY_RP_ID = process.env.EXPO_PUBLIC_PASSKEY_RP_ID ?? 'latch.finance';

export {
  HORIZON_URL,
  LATCH_BACKEND_URL,
  PASSKEY_RP_ID,
  STELLAR_AUTH_PREFIX,
  STELLAR_NETWORK_PASSPHRASE,
  STELLAR_RPC_URL,
  STELLAR_VERIFIER_ADDRESS,
};
