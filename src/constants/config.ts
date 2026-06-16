import { Networks } from '@stellar/stellar-sdk';

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

// ─── Swap / liquidity aggregation (Soroswap Aggregator API) ───────────────────
// The API key is baked into the bundle (EXPO_PUBLIC_*). Testnet only — move the
// key behind a backend proxy before production, same as EXPO_PUBLIC_BUNDLER_SECRET.
const SOROSWAP_API_URL = (
  process.env.EXPO_PUBLIC_SOROSWAP_API_URL ?? 'https://api.soroswap.finance'
).replace(/\/+$/, '');
const SOROSWAP_API_KEY = process.env.EXPO_PUBLIC_SOROSWAP_API_KEY ?? '';
// Soroswap expects the network as a lowercase query param (?network=testnet|mainnet).
const SOROSWAP_NETWORK = ACTIVE_NETWORK.network === 'TESTNET' ? 'testnet' : 'mainnet';

// ─── Aquarius AMM (testnet swap liquidity) ────────────────────────────────────
// Soroswap has no testnet pools, but Aquarius does. These are TESTNET values —
// Aquarius resets testnet quarterly, so the router can be overridden via env.
// (Mainnet swaps use Soroswap, not Aquarius.)
const AQUARIUS_AMM_API_URL =
  process.env.EXPO_PUBLIC_AQUARIUS_API_URL ??
  'https://amm-api-testnet.aqua.network/api/external/v1';
const AQUARIUS_ROUTER_ADDRESS =
  process.env.EXPO_PUBLIC_AQUARIUS_ROUTER ??
  'CBCFTQSPDBAIZ6R6PJQKSQWKNKWH2QIV3I4J72SHWBIK3ADRRAM5A6GD';

export {
  AQUARIUS_AMM_API_URL,
  AQUARIUS_ROUTER_ADDRESS,
  HORIZON_URL,
  PASSKEY_RP_ID,
  SOROSWAP_API_KEY,
  SOROSWAP_API_URL,
  SOROSWAP_NETWORK,
  STELLAR_AUTH_PREFIX,
  STELLAR_NETWORK_PASSPHRASE,
  STELLAR_RPC_URL,
  STELLAR_VERIFIER_ADDRESS,
};
