import { useQuery } from '@tanstack/react-query';
import { getPrices, type PriceData } from '../api/latch-auth';

export const FALLBACK_PRICES: Record<string, PriceData> = {
  XLM: { price: '0.16', change_24h: 0 },
  USDC: { price: '1.0', change_24h: 0 },
  USDT: { price: '1.0', change_24h: 0 },
};

// The backend uses 'native' for XLM; all other tokens use their symbol.
// Normalize to the uppercase codes used throughout the app.
function normalizeRaw(raw: Record<string, PriceData | null>): Record<string, PriceData> {
  const out: Record<string, PriceData> = { ...FALLBACK_PRICES };
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    out[key === 'native' ? 'XLM' : key.toUpperCase()] = value;
  }
  return out;
}

export function usePrices() {
  return useQuery({
    queryKey: ['prices'],
    queryFn: async () => normalizeRaw(await getPrices(['native', 'usdc', 'usdt', 'eurc', 'xlm'])),
    staleTime: 60_000,
    placeholderData: FALLBACK_PRICES,
  });
}
