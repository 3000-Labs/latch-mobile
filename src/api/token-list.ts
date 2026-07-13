import axios from 'axios';
import { ACTIVE_NETWORK } from '../constants/config';

export interface TokenListItem {
  code: string;
  issuer: string;
  contract?: string;
  icon: string;
  name?: string;
}

// Keyed by symbol (e.g. "USDC") for fast O(1) lookup.
// Also keyed by "SYMBOL:ISSUER" for issuer-precise lookups.
// First-occurrence wins within each key (highest-ranked list takes priority).
export type TokenMap = Record<string, TokenListItem>;

const MAINNET_LIST_URLS = [
  'https://api.stellar.expert/explorer/public/asset-list/top50',
  'https://lobstr.co/api/v1/sep/assets/curated.json',
  'https://raw.githubusercontent.com/soroswap/token-list/main/tokenList.json',
];

const TESTNET_LIST_URLS = [
  'https://api.stellar.expert/explorer/testnet/asset-list/top50',
  'https://lobstr.co/api/v1/sep/assets/curated.json',
  'https://raw.githubusercontent.com/soroswap/token-list/main/tokenList.json',
];

export async function fetchTokenList(): Promise<TokenMap> {
  const urls = ACTIVE_NETWORK.network === 'TESTNET' ? TESTNET_LIST_URLS : MAINNET_LIST_URLS;

  const settled = await Promise.allSettled(
    urls.map((url) =>
      axios
        .get<{ assets: TokenListItem[] }>(url, { timeout: 10_000 })
        .then((res) => (Array.isArray(res.data?.assets) ? res.data.assets : [])),
    ),
  );

  const combined: TokenListItem[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      combined.push(...result.value);
    }
  }

  const map: TokenMap = {};
  for (const t of combined) {
    if (!t.code || !t.icon) continue;
    const codeKey = t.code.toUpperCase();
    const fullKey = `${codeKey}:${t.issuer ?? ''}`;
    if (!map[fullKey]) map[fullKey] = t;
    if (!map[codeKey]) map[codeKey] = t; // symbol-only fallback, first occurrence wins
  }
  return map;
}
