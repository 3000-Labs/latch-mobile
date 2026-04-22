# The Plan

## Step 1 — Install `stellar-hd-wallet`

This library follows **SEP-0005** — Stellar's standard for deriving keypairs from BIP-39 mnemonics. This is the same concept as MetaMask's 12-word phrase.

```bash
npm install stellar-hd-wallet
```

## Step 2 — Add `lib/seed-wallet.ts`

Create a new file `src/lib/seed-wallet.ts` (or similar) to handle wallet generation and restoration.

```typescript
import StellarHDWallet from "stellar-hd-wallet";
import { Keypair } from "@stellar/stellar-sdk";

export interface StellarWallet {
  mnemonic: string;      // 12-word phrase — user must save this
  publicKeyHex: string;  // 64-char hex — used to deploy smart account
  gAddress: string;      // G... address — human-readable public key
  keypair: Keypair;      // full keypair — used to sign transactions
}

export function generateStellarWallet(): StellarWallet {
  const mnemonic = StellarHDWallet.generateMnemonic();
  const wallet = StellarHDWallet.fromMnemonic(mnemonic);
  const keypair = wallet.getKeypair(0); // account index 0, same as Freighter default

  const pubkeyBytes = keypair.rawPublicKey();
  const publicKeyHex = Buffer.from(pubkeyBytes).toString("hex");
  const gAddress = keypair.publicKey(); // G...

  return { mnemonic, publicKeyHex, gAddress, keypair };
}

export function restoreStellarWallet(mnemonic: string): StellarWallet {
  const wallet = StellarHDWallet.fromMnemonic(mnemonic);
  const keypair = wallet.getKeypair(0);

  const pubkeyBytes = keypair.rawPublicKey();
  const publicKeyHex = Buffer.from(pubkeyBytes).toString("hex");
  const gAddress = keypair.publicKey();

  return { mnemonic, publicKeyHex, gAddress, keypair };
}
```

## Step 3 — Deploy the smart account

The `publicKeyHex` from your wallet plugs directly into the existing route — no changes needed:

```typescript
const wallet = generateStellarWallet();

// Goal 2: deploy smart account (exact same route Phantom uses)
const res = await fetch("/api/smart-account/factory", {
  method: "POST",
  body: JSON.stringify({ publicKeyHex: wallet.publicKeyHex }),
});
const { smartAccountAddress } = await res.json(); // C... address
```

## Step 4 — Sign transactions

When submitting, instead of asking Phantom to sign, you use the keypair directly:

```typescript
// Server returns authDigestHex from /api/transaction/build
const prefixedMessage = "Stellar Smart Account Auth:\n" + authDigestHex;
const messageBytes = Buffer.from(prefixedMessage, "utf8");

// Sign with the keypair (Ed25519, same as Phantom)
const signatureBytes = wallet.keypair.sign(messageBytes);
const authSignatureHex = Buffer.from(signatureBytes).toString("hex");

// Submit — exact same route as Phantom
await fetch("/api/transaction/submit", {
  method: "POST",
  body: JSON.stringify({
    txXdr, 
    authEntryXdr,
    authSignatureHex,
    prefixedMessage,
    publicKeyHex: wallet.publicKeyHex,
  }),
});
```

---

## How it maps to the existing architecture

1. `generateStellarWallet()` **[NEW]** (`lib/seed-wallet.ts`)
    * *Output:* `publicKeyHex`
2. `/api/smart-account/factory` **[EXISTING]** (unchanged)
    * *Output:* `smartAccountAddress`
3. `/api/transaction/build` **[EXISTING]** (unchanged)
    * *Output:* `authDigestHex`
4. `keypair.sign(prefixedMessage)` **[NEW]** (replaces Phantom extension call)
    * *Output:* `authSignatureHex`
5. `/api/transaction/submit` **[EXISTING]** (unchanged)

**Note:** Nothing on the server needs to change — a seed-derived Stellar keypair is just another Ed25519 key, identical to Phantom from the smart account's perspective.

---

**Next Steps:**
I can implement this by installing the package, creating `lib/seed-wallet.ts`, and wiring it into the demo UI alongside the existing Phantom/Freighter/WebAuthn options.
