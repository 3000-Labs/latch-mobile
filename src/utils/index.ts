import tokens from '../constants/tokens';

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
