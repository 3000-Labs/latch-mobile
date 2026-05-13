import { useQuery } from '@tanstack/react-query';
import { fetchTokenList } from '../api/token-list';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export function useTokenList() {
  return useQuery({
    queryKey: ['token-list'],
    queryFn: fetchTokenList,
    staleTime: TWENTY_FOUR_HOURS,
    gcTime: TWENTY_FOUR_HOURS * 2,
  });
}

export function useTokenIcon(code?: string, issuer?: string): string | null {
  const { data } = useTokenList();
  if (!code) return null;

  const codeKey = code.toUpperCase();

  // XLM uses the bundled stellar.png — returning null lets TokenIcon use its local fallback.
  if (codeKey === 'XLM') return null;

  const fullKey = issuer ? `${codeKey}:${issuer}` : null;

  const stellarIcon = data && ((fullKey && data[fullKey]?.icon) || data[codeKey]?.icon);
  if (stellarIcon) return stellarIcon;

  // Stellar lists only cover Stellar-native assets. Fall back to CoinCap CDN for
  // major crypto symbols (BTC, ETH, SOL, etc.). TokenIcon's onError handles 404s.
  return `https://assets.coincap.io/assets/icons/${codeKey.toLowerCase()}@2x.png`;
}
