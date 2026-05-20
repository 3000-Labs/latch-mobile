import tokens from '../constants/tokens';
import { TokenBalance } from '../hooks/use-portfolio';

export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  const visibleChars = Math.max(2, Math.floor(name.length / 3));
  const maskedName =
    name.substring(0, visibleChars) + '*'.repeat(Math.max(1, name.length - visibleChars));
  return `${maskedName}@${domain}`;
};

export const maskAddress = (address: string, startChars = 8, endChars = 4): string => {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }

  const start = address.substring(0, startChars);
  const end = address.substring(address.length - endChars);

  return `${start}...${end}`;
};

export function shortenAddress(address: string | null): string {
  if (!address) return '—';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
const DEFAULT_TOKEN_ICON = require('@/src/assets/token/stellar.png');
export const getTokenIcon = (code: string) => {
  const token = tokens[code?.toUpperCase()];
  if (token && token.logoURI) {
    return { uri: token.logoURI };
  }
  return DEFAULT_TOKEN_ICON;
};

interface CryptoData {
  prices: Record<string, any>;
  portfolio: TokenBalance[];
}

export function calculatePortfolio24hChangeFormatted(
  data: CryptoData,
  decimals: number = 2,
): string {
  const livePrices = data.prices ?? {};
  const portfolio = data.portfolio ?? [];

  let currentTotalValue = 0;
  let pastTotalValue = 0;

  portfolio.forEach((item) => {
    const priceInfo = livePrices[item.code];
    if (!priceInfo) return;

    const currentPrice = parseFloat(priceInfo.price || '0');
    const amount = parseFloat(item.amount || '0');
    const change24h = priceInfo.change_24h || 0;

    const currentAssetValue = amount * currentPrice;
    currentTotalValue += currentAssetValue;

    const pastPrice = currentPrice / (1 + change24h / 100);
    const pastAssetValue = amount * pastPrice;
    pastTotalValue += pastAssetValue;
  });

  if (pastTotalValue === 0) return (0).toFixed(decimals);

  const totalPercentageChange = ((currentTotalValue - pastTotalValue) / pastTotalValue) * 100;

  // .toFixed() handles the decimal constraints cleanly
  return totalPercentageChange.toFixed(decimals);
}

export function getTotalUSDBalance({
  portfolio,
  livePrices,
}: {
  portfolio: TokenBalance[] | undefined;
  livePrices: Record<string, any>;
}) {
  return ((portfolio as TokenBalance[]) ?? []).reduce((sum, item) => {
    const priceString = livePrices[item.code]?.price;

    const price = parseFloat(priceString || 0);
    const amount = parseFloat(item.amount || '0');

    const usdValue = amount * price;

    return sum + (isNaN(usdValue) ? 0 : usdValue);
  }, 0);
}

export const stroopToXlm = (stroops: BigNumber | string | number): BigNumber => {
  if (stroops instanceof BigNumber) {
    return stroops.dividedBy(1e7);
  }
  return new BigNumber(Number(stroops) / 1e7);
};
