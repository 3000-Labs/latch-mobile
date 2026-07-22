import { ACTIVE_NETWORK } from '@/src/constants/config';
import { aquariusProvider } from './providers/aquarius';
import { mockSwapProvider } from './providers/mock';
import { soroswapProvider } from './providers/soroswap';
import type { SwapProvider, SwapProviderMeta } from './types';

// Network-specific swap routing:
//   • mainnet  → Soroswap aggregator (deep liquidity, hosted API)
//   • testnet  → Aquarius AMM (Soroswap has no testnet pools; Aquarius does)
// Set EXPO_PUBLIC_SWAP_USE_MOCK=true to force the dev mock on testnet (e.g. if
// Aquarius's testnet deployment is mid-reset). See providers/*.ts.
const USE_MOCK = process.env.EXPO_PUBLIC_SWAP_USE_MOCK === 'true';

const TESTNET_PROVIDER = USE_MOCK ? mockSwapProvider : aquariusProvider;

// First entry is the default. The SwapProvider interface keeps the UI +
// execution generic across providers. A function, not a frozen module-level
// const, so a live network switch (src/lib/network-switch.ts) picks the right
// provider on the next call instead of only after a fresh app launch.
function getProviders(): SwapProvider[] {
  return ACTIVE_NETWORK.network === 'TESTNET' ? [TESTNET_PROVIDER] : [soroswapProvider];
}

export function listSwapProviders(): SwapProviderMeta[] {
  return getProviders().map(({ id, name, icon }) => ({ id, name, icon }));
}

/** Returns the provider with `id`, or the default (first) provider. */
export function getActiveSwapProvider(id?: string): SwapProvider {
  const providers = getProviders();
  return providers.find((p) => p.id === id) ?? providers[0];
}
