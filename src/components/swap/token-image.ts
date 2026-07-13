import type { ImageSourcePropType } from 'react-native';

// SwapCard renders a bundled image (ImageSourcePropType). Map known token codes
// to local assets; everything else falls back to the Stellar mark. Icons here
// are cosmetic — routing/quoting keys off the SAC contract id, not this map.
const TOKEN_IMAGES: Record<string, ImageSourcePropType> = {
  XLM: require('@/src/assets/token/stellar.png'),
  USDT: require('@/src/assets/token/usdt.png'),
  ETH: require('@/src/assets/token/eth.png'),
  SOL: require('@/src/assets/token/solana.png'),
  XRP: require('@/src/assets/token/ripple.png'),
  DOT: require('@/src/assets/token/pokadot.png'),
  ADA: require('@/src/assets/token/pokadot.png'),
};

const FALLBACK: ImageSourcePropType = require('@/src/assets/token/stellar.png');

export function swapTokenImage(code?: string): ImageSourcePropType {
  if (!code) return FALLBACK;
  return TOKEN_IMAGES[code.toUpperCase()] ?? FALLBACK;
}
