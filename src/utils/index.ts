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
