/**
 * passkey.ts — WebAuthn/passkey smart account deployment via direct Soroban RPC.
 *
 * The previous implementation called predictAddress() before deploying, which made
 * an extra simulateTransaction XHR call (for get_account_address) that failed on
 * Android with status=0 before anything else could run.
 *
 * This rewrite mirrors the working smart-account.ts Ed25519 deployment pattern:
 *   1. Build the create_account transaction
 *   2. Simulate it (one sorobanCall, same as the Ed25519 path)
 *   3. Assemble, sign, send
 *   4. Poll getTransaction and extract the address from resultMetaXdr
 *
 * No predictAddress call → no extra network round-trip → no Android status=0 failure.
 * The deployed address is persisted to SecureStore so lookupSmartAccount can return
 * it across app restarts without making any network calls.
 *
 * XHR transport: same XMLHttpRequest-based sorobanCall as smart-account.ts.
 * Horizon calls: native fetch (works on Android for non-Soroban endpoints).
 */

import {
  Account,
  Contract,
  Keypair,
  Networks,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';
import * as SecureStore from 'expo-secure-store';
import QuickCrypto from 'react-native-quick-crypto';
import { SECURE_KEYS } from '../store/wallet';

// ─── Config ──────────────────────────────────────────────────────────────────

const getConfig = () => ({
  rpcUrl: process.env.EXPO_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  horizonUrl: process.env.EXPO_PUBLIC_HORIZON_TESTNET_URL || 'https://horizon-testnet.stellar.org',
  networkPassphrase: process.env.EXPO_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET,
  factoryAddress: process.env.EXPO_PUBLIC_FACTORY_ADDRESS,
  bundlerSecret: process.env.EXPO_PUBLIC_BUNDLER_SECRET,
});

// ─── XDR → base64 (React Native safe) ────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function txToBase64(tx: { toEnvelope(): { toXDR(): Uint8Array } }): string {
  return toBase64(new Uint8Array(tx.toEnvelope().toXDR()));
}


// ─── XMLHttpRequest-based JSON-RPC ───────────────────────────────────────────
// Matches the sorobanCall in smart-account.ts which is known to work on Android.

function sorobanCall(rpcUrl: string, method: string, params: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', rpcUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 60000;
    xhr.onload = function () {
      try {
        const json = JSON.parse(xhr.responseText);
        if (json.error) {
          reject(new Error(`${method}: ${json.error.message ?? JSON.stringify(json.error)}`));
        } else {
          resolve(json.result);
        }
      } catch {
        reject(new Error(`${method}: parse error (status=${xhr.status})`));
      }
    };
    xhr.onerror = function () {
      reject(new Error(`${method}: network error (status=${xhr.status})`));
    };
    xhr.ontimeout = function () {
      reject(new Error(`${method}: timed out`));
    };
    xhr.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
  });
}

// ─── Horizon account fetch (native fetch — works fine for non-Soroban calls) ─

async function getBundlerAccount(horizonUrl: string, publicKey: string): Promise<Account> {
  const res = await fetch(`${horizonUrl}/accounts/${publicKey}`);
  if (!res.ok) throw new Error(`Horizon ${res.status}: bundler account not found`);
  const data = await res.json();
  return new Account(publicKey, data.sequence);
}

// ─── Salt derivation (must match the on-chain factory "webauthn-v1" salt) ───

function deriveSalt(keyDataHex: string): Buffer {
  const saltHex = QuickCrypto.createHash('sha256')
    .update(keyDataHex + 'webauthn-v1')
    .digest('hex');
  return Buffer.from(saltHex as string, 'hex');
}

// ─── AccountInitParams XDR ────────────────────────────────────────────────────

function buildParamsMap(keyDataHex: string, salt: Buffer): xdr.ScVal {
  const signerStruct = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('key_data'),
      val: xdr.ScVal.scvBytes(Buffer.from(keyDataHex, 'hex')),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('signer_kind'),
      val: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('WebAuthn')]),
    }),
  ]);

  const externalSigner = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('External'), signerStruct]);

  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('account_salt'),
      val: xdr.ScVal.scvBytes(salt),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('signers'),
      val: xdr.ScVal.scvVec([externalSigner]),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('threshold'),
      val: xdr.ScVal.scvVoid(),
    }),
  ]);
}

// ─── Sim result adapter ───────────────────────────────────────────────────────

function parseSimResult(raw: any): rpc.Api.SimulateTransactionSuccessResponse {
  return {
    id: String(raw.id ?? '1'),
    latestLedger: raw.latestLedger,
    minResourceFee: raw.minResourceFee,
    transactionData: xdr.SorobanTransactionData.fromXDR(raw.transactionData, 'base64'),
    cost: raw.cost ?? { cpuInsns: '0', memBytes: '0' },
    events: [],
    results: [
      {
        auth: (raw.results?.[0]?.auth ?? []).map((a: string) =>
          xdr.SorobanAuthorizationEntry.fromXDR(a, 'base64'),
        ),
        retval: (() => {
          try {
            return xdr.ScVal.fromXDR(raw.results?.[0]?.retval || 'AAAAAA==', 'base64');
          } catch {
            return xdr.ScVal.scvVoid();
          }
        })(),
      },
    ],
  } as unknown as rpc.Api.SimulateTransactionSuccessResponse;
}

// ─── Extract deployed address from settled tx metadata (Protocol 21 v3 / 22 v4) ─

function extractAddressFromMeta(resultMetaXdr: string): string | undefined {
  try {
    const meta = xdr.TransactionMeta.fromXDR(resultMetaXdr, 'base64');
    const arm = (meta as any).arm();
    let sorobanMeta: any;
    if (arm === 'v3') sorobanMeta = meta.v3().sorobanMeta();
    else if (arm === 'v4') sorobanMeta = (meta as any).v4().sorobanMeta();
    if (sorobanMeta) return scValToNative(sorobanMeta.returnValue());
  } catch (e) {
    console.warn('[passkey] could not parse address from resultMetaXdr:', e);
  }
  return undefined;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DeployResult {
  smartAccountAddress: string;
  alreadyDeployed: boolean;
  error?: string;
}

export interface LookupResult {
  deployed: boolean;
  smartAccountAddress: string;
}

// ─── Deploy ───────────────────────────────────────────────────────────────────

/**
 * Deploy a Soroban smart account for a WebAuthn/passkey credential.
 *
 * Does NOT call predictAddress (get_account_address simulation) — that was the
 * extra XHR call that failed on Android with status=0. The deployed address is
 * read from the settled transaction's resultMetaXdr and persisted to SecureStore.
 *
 * @param credentialId  Local credential identifier (cache + SecureStore key)
 * @param keyDataHex    Uncompressed P-256 pubkey (65B = 130 hex) + credentialId hex (16B = 32 hex)
 */
export async function deploySmartAccount(
  credentialId: string,
  keyDataHex: string,
  skipCache = false,
): Promise<DeployResult> {
  if (!keyDataHex || keyDataHex.length < 132) {
    return {
      smartAccountAddress: '',
      alreadyDeployed: false,
      error: `keyDataHex too short (got ${keyDataHex?.length ?? 0}, need ≥132)`,
    };
  }

  // Check SecureStore first — survives across app restarts.
  // Skipped when deploying a new additional account (skipCache=true), because
  // SMART_ACCOUNT holds the ACTIVE account's address, not this new account's.
  if (!skipCache) {
    const stored = await SecureStore.getItemAsync(SECURE_KEYS.SMART_ACCOUNT);
    if (stored) return { smartAccountAddress: stored, alreadyDeployed: true };
  }

  try {
    const config = getConfig();
    const { rpcUrl, horizonUrl, networkPassphrase, factoryAddress, bundlerSecret } = config;

    if (!factoryAddress || !bundlerSecret) {
      return {
        smartAccountAddress: '',
        alreadyDeployed: false,
        error: 'EXPO_PUBLIC_FACTORY_ADDRESS or EXPO_PUBLIC_BUNDLER_SECRET not set',
      };
    }

    const bundlerKeypair = Keypair.fromSecret(bundlerSecret);
    const salt = deriveSalt(keyDataHex);
    const paramsMap = buildParamsMap(keyDataHex, salt);
    const factory = new Contract(factoryAddress);

    console.log('[passkey] fetching bundler account from Horizon...');
    const bundlerAccount = await getBundlerAccount(horizonUrl, bundlerKeypair.publicKey());
    console.log('[passkey] bundler seq:', bundlerAccount.sequenceNumber());

    const createTx = new TransactionBuilder(bundlerAccount, {
      fee: '1500000',
      networkPassphrase,
    })
      .addOperation(factory.call('create_account', paramsMap))
      .setTimeout(300)
      .build();

    console.log('[passkey] simulating create_account...');
    const rawSim = await sorobanCall(rpcUrl, 'simulateTransaction', {
      transaction: txToBase64(createTx),
    });
    if (rawSim.error) throw new Error(`create_account simulation failed: ${rawSim.error}`);
    console.log('[passkey] simulation ok, assembling...');

    const assembled = rpc.assembleTransaction(createTx, parseSimResult(rawSim)).build();
    assembled.sign(bundlerKeypair);

    const sendRaw = await sorobanCall(rpcUrl, 'sendTransaction', {
      transaction: txToBase64(assembled),
    });
    console.log('[passkey] sendTransaction status:', sendRaw.status);

    if (sendRaw.status === 'ERROR') {
      throw new Error(
        `sendTransaction ERROR: ${sendRaw.errorResultXdr ?? JSON.stringify(sendRaw)}`,
      );
    }

    let smartAccountAddress: string | undefined;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await sorobanCall(rpcUrl, 'getTransaction', { hash: sendRaw.hash });
      console.log(`[passkey] poll ${i + 1}: ${poll.status}`);

      if (poll.status === 'NOT_FOUND') continue;

      if (poll.status === 'SUCCESS') {
        if (poll.resultMetaXdr) {
          smartAccountAddress = extractAddressFromMeta(poll.resultMetaXdr);
        }
        break;
      }

      throw new Error(`Deployment failed with status: ${poll.status}`);
    }

    if (!smartAccountAddress) {
      throw new Error('Transaction settled but could not extract smart account address');
    }

    console.log('[passkey] deployed:', smartAccountAddress);
    return { smartAccountAddress, alreadyDeployed: false };
  } catch (error: any) {
    console.error('[passkey] deploySmartAccount error:', error?.message);
    return {
      smartAccountAddress: '',
      alreadyDeployed: false,
      error: error?.message ?? 'Deployment failed',
    };
  }
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Check whether a smart account has been deployed for the given credential.
 *
 * Reads from SecureStore first (no network call needed if previously deployed).
 * Falls back to getLedgerEntries against the factory-predicted address only if
 * the address can be derived from SecureStore data.
 */
export async function lookupSmartAccount(
  credentialId: string,
  keyDataHex: string,
): Promise<LookupResult> {
  if (!keyDataHex || keyDataHex.length < 132) return { deployed: false, smartAccountAddress: '' };

  // Prefer the stored address — avoids any sorobanCall on Android
  const stored = await SecureStore.getItemAsync(SECURE_KEYS.SMART_ACCOUNT);
  if (stored) return { deployed: true, smartAccountAddress: stored };

  return { deployed: false, smartAccountAddress: '' };
}
