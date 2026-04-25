// The deployed URL of the latch Next.js backend
const BASE_URL = process.env.EXPO_PUBLIC_SOROBAN_RPC_URL ?? '';
const ACCESS_TOKEN_KEY = 'latch_access_token';
const REFRESH_TOKEN_KEY = 'latch_refresh_token';

// Stellar / Soroban constants
const LATCH_BACKEND_URL = BASE_URL;
const STELLAR_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const STELLAR_RPC_URL =
  process.env.EXPO_PUBLIC_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const STELLAR_AUTH_PREFIX = 'Stellar Smart Account Auth:\n';

export {
  ACCESS_TOKEN_KEY,
  BASE_URL,
  LATCH_BACKEND_URL,
  REFRESH_TOKEN_KEY,
  STELLAR_AUTH_PREFIX,
  STELLAR_NETWORK_PASSPHRASE,
  STELLAR_RPC_URL,
};
