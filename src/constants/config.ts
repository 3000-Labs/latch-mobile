import { Networks } from '@stellar/stellar-sdk';

// ─── Backend API ──────────────────────────────────────────────────────────────
// EXPO_PUBLIC_API_BASE_URL is the Latch Next.js backend.
// EXPO_PUBLIC_SOROBAN_RPC_URL is the Soroban JSON-RPC endpoint — different host.
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const ACCESS_TOKEN_KEY = 'latch_access_token';
const REFRESH_TOKEN_KEY = 'latch_refresh_token';

const LATCH_BACKEND_URL = BASE_URL;

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

// Minimum XLM reserve per Stellar protocol:
//   (BASE_RESERVE_MIN_COUNT + subentry_count + num_sponsoring - num_sponsored) × BASE_RESERVE
export const BASE_RESERVE = 0.5;
export const BASE_RESERVE_MIN_COUNT = 2;

export {
  ACCESS_TOKEN_KEY,
  BASE_URL,
  HORIZON_URL,
  LATCH_BACKEND_URL,
  REFRESH_TOKEN_KEY,
  STELLAR_AUTH_PREFIX,
  STELLAR_NETWORK_PASSPHRASE,
  STELLAR_RPC_URL,
};
