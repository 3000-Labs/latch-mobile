import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { Keypair } from '@stellar/stellar-sdk';

export interface StellarWallet {
  mnemonic: string; // 12-word phrase — user must save this
  publicKeyHex: string; // 64-char hex — used to deploy smart account
  gAddress: string; // G... address — human-readable public key
  keypair: Keypair; // full keypair — used to sign transactions
}

// SLIP-0010 Ed25519 HD derivation (SEP-0005)
function masterKey(seed: Uint8Array) {
  const I = hmac(sha512, new TextEncoder().encode('ed25519 seed'), seed);
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

function childKey(parent: { key: Uint8Array; chainCode: Uint8Array }, index: number) {
  const indexBytes = new Uint8Array(4);
  new DataView(indexBytes.buffer).setUint32(0, index + 0x80000000, false);
  const data = new Uint8Array([0x00, ...parent.key, ...indexBytes]);
  const I = hmac(sha512, parent.chainCode, data);
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

// m/44'/148'/0' — SEP-0005 Stellar path
function deriveKeypair(seed: Uint8Array): Keypair {
  let node = masterKey(seed);
  node = childKey(node, 44);
  node = childKey(node, 148);
  node = childKey(node, 0);
  return Keypair.fromRawEd25519Seed(Buffer.from(node.key));
}

function walletFromMnemonic(mnemonic: string): StellarWallet {
  const seed = mnemonicToSeedSync(mnemonic);
  const keypair = deriveKeypair(seed);

  const publicKeyHex = Buffer.from(keypair.rawPublicKey()).toString('hex');
  const gAddress = keypair.publicKey();

  return { mnemonic, publicKeyHex, gAddress, keypair };
}

export function generateStellarWallet(): StellarWallet {
  const mnemonic = generateMnemonic(wordlist, 128); // 128 bits = 12 words
  return walletFromMnemonic(mnemonic);
}

export function restoreStellarWallet(mnemonic: string): StellarWallet {
  return walletFromMnemonic(mnemonic);
}
