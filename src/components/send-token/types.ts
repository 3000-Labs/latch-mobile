export const TOKENS = [
  {
    id: 'solana',
    name: 'Solana',
    balance: '18.6',
    symbol: 'SOL',
    icon: require('@/src/assets/token/solana.png'),
  },
  {
    id: 'tether',
    name: 'Tether',
    balance: '5.2',
    symbol: 'TET',
    icon: require('@/src/assets/token/usdt.png'),
  },
  {
    id: 'stellar',
    name: 'Stellar',
    balance: '1500',
    symbol: 'STE',
    icon: require('@/src/assets/token/stellar.png'),
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    balance: '0.75',
    symbol: 'ETH',
    icon: require('@/src/assets/token/eth.png'),
  },
  {
    id: 'polkadot',
    name: 'Polkadot',
    balance: '30',
    symbol: 'DOT',
    icon: require('@/src/assets/token/pokadot.png'),
  },
  {
    id: 'ripple',
    name: 'Ripple',
    balance: '2000',
    symbol: 'XRP',
    icon: require('@/src/assets/token/ripple.png'),
  },
];

export const WALLETS = [
  { name: 'Crownz Wallet', address: '0xE643...e16c' },
  { name: 'CryptoSafe Vault', address: '0xB4f2...a9d5' },
  { name: 'GreenCoin Wallet', address: '0xF7f9...c2d3' },
  { name: 'BlockSphere Wallet', address: '0xC9d1...e7fa' },
  { name: 'DigiFunds Wallet', address: '0xA3d8...f11b' },
];

export const NUMERIC_KEYS = [
  { num: '1', sub: '' },
  { num: '2', sub: 'A B C' },
  { num: '3', sub: 'D E F' },
  { num: '4', sub: 'G H I' },
  { num: '5', sub: 'J K L' },
  { num: '6', sub: 'M N O' },
  { num: '7', sub: 'P Q R S' },
  { num: '8', sub: 'T U V' },
  { num: '9', sub: 'W X Y Z' },
];

export const SYMBOL_KEYS = ['+', '-', '*', '/', '#', '.', '(', ')', '='];

export type Token = (typeof TOKENS)[0];
export type Wallet = (typeof WALLETS)[0];
export type SendStatus = 'initial' | 'sending' | 'success' | 'view_transaction';
