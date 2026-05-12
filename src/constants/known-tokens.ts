import { ACTIVE_NETWORK } from './config';

export const TRACKED_TOKENS_STORAGE_KEY = 'latch_tracked_tokens';

export interface TokenConfig {
  code: string;
  /**
   * Classic Stellar G-address issuer. Required when sacContractId is absent.
   * Used to compute the SAC contract ID via Asset(code, issuer).contractId().
   */
  issuer?: string;
  /**
   * Direct SAC C-address. When present, used as-is — no issuer needed.
   * Smart-wallet users can add tokens by SAC contract ID without knowing the issuer.
   */
  sacContractId?: string;
  name: string;
}

/**
 * Curated list of tokens shown on the "Add Token" screen.
 * Issuers are network-aware (testnet vs mainnet).
 */
export const WELL_KNOWN_TOKENS: TokenConfig[] =
  ACTIVE_NETWORK.network === 'TESTNET'
    ? [
        {
          code: 'USDC',
          issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          name: 'USD Coin',
        },
        {
          code: 'USDT',
          issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          name: 'Tether USD',
        },
      ]
    : [
        {
          code: 'USDC',
          issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
          name: 'USD Coin',
        },
      ];
