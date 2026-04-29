/**
 * passkey.ts — on-device Soroban smart account deployment.
 *
 * All Soroban RPC and Horizon calls use native `fetch` (not rpc.Server, which goes
 * through @tradle/react-native-http and corrupts request bodies in React Native).
 *
 * XDR → base64 uses btoa() with an explicit Uint8Array → binary string loop.
 * This avoids the Buffer polyfill issue where Buffer.from(uint8array).toString('base64')
 * can silently produce wrong output in React Native (Hermes / JSC environments).
 */

import {
  Account,
  Address,
  Contract,
  Keypair,
  Networks,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';
import QuickCrypto from 'react-native-quick-crypto';

const getConfig = () => ({
  rpcUrl: process.env.EXPO_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  horizonUrl: process.env.EXPO_PUBLIC_HORIZON_TESTNET_URL || 'https://horizon-testnet.stellar.org',
  networkPassphrase: process.env.EXPO_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET,
  factoryAddress: process.env.EXPO_PUBLIC_FACTORY_ADDRESS,
  bundlerSecret: process.env.EXPO_PUBLIC_BUNDLER_SECRET,
});

// In-memory cache keyed by credentialId
const cache: Map<string, string> = new Map();

// ─── XDR → base64 (React Native safe) ────────────────────────────────────────
// Uses btoa() with a byte-by-byte binary string — avoids Buffer polyfill issues.
// Buffer.from(uint8array).toString('base64') silently produces "0,255,..." in some
// React Native environments because @stellar/js-xdr can return a raw Uint8Array.
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function txToBase64(tx: { toEnvelope(): { toXDR(): Uint8Array } }): string {
  return toBase64(new Uint8Array(tx.toEnvelope().toXDR()));
}

function scValToBase64(val: xdr.ScVal): string {
  return toBase64(new Uint8Array(val.toXDR()));
}

function ledgerKeyToBase64(key: xdr.LedgerKey): string {
  return toBase64(new Uint8Array(key.toXDR()));
}

// ─── Raw JSON-RPC via XMLHttpRequest ─────────────────────────────────────────
// Uses XMLHttpRequest directly instead of fetch() / whatwg-fetch.
//
// whatwg-fetch (loaded by react-native/Libraries/Network/fetch.js) sets
// xhr.responseType = 'blob' when Blob/FileReader are present in the RN environment.
// That causes xhr.onerror to fire for plain JSON responses from the Soroban RPC,
// producing "Network request failed" even when the server is reachable.
// Using XHR directly with no responseType forces text/string handling.

function sorobanCall(rpcUrl: string, method: string, params: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', rpcUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 60000; // 60s — testnet can be slow under load

    xhr.onload = function () {
      try {
        const json = JSON.parse(xhr.responseText);
        if (json.error) {
          reject(new Error(`${method}: ${json.error.message ?? JSON.stringify(json.error)}`));
        } else {
          resolve(json.result);
        }
      } catch {
        reject(
          new Error(
            `${method}: network error reaching ${rpcUrl} (status=${xhr.status}, readyState=${xhr.readyState})`,
          ),
        );
      }
    };

    xhr.onerror = function () {
      // status=0 + onerror = TLS/ATS rejection or no connectivity
      // status>0 + onerror = unexpected (shouldn't happen with XHR)
      console.log({
        method,
        rpcUrl,
        status: xhr.status,
        readyState: xhr.readyState,
        responseText: xhr.responseText,
      });
      reject(
        new Error(
          `${method}: network error reaching ${rpcUrl} (status=${xhr.status}, readyState=${xhr.readyState})`,
        ),
      );
    };

    xhr.ontimeout = function () {
      reject(new Error(`${method}: request timed out`));
    };

    xhr.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
  });
}

// ─── Horizon account fetch ────────────────────────────────────────────────────

function getAccount(horizonUrl: string, publicKey: string): Promise<Account> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${horizonUrl}/accounts/${publicKey}`, true);
    xhr.timeout = 15000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(new Account(publicKey, data.sequence));
        } catch {
          reject(new Error(`Failed to parse Horizon account response`));
        }
      } else {
        // This handles 405, 500, etc., even if the body isn't valid JSON
        reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = function () {
      reject(new Error(`Network error fetching bundler account`));
    };

    xhr.ontimeout = function () {
      reject(new Error(`Horizon request timed out`));
    };

    xhr.send();
  });
}

// ─── Salt: must match the web backend ("webauthn-v1") ────────────────────────

function deriveSalt(keyDataHex: string): Buffer {
  const saltHex = QuickCrypto.createHash('sha256')
    .update(keyDataHex + 'webauthn-v1')
    .digest('hex');
  return Buffer.from(saltHex as string, 'hex');
}

// ─── AccountInitParams XDR (matches web /api/smart-account/webauthn route) ───

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

/**
 * Convert raw JSON-RPC simulateTransaction result into the shape
 * rpc.assembleTransaction expects (decoded XDR objects, not base64 strings).
 */
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
        retval: xdr.ScVal.fromXDR(raw.results?.[0]?.retval ?? 'AAAAAA==', 'base64'),
      },
    ],
  } as unknown as rpc.Api.SimulateTransactionSuccessResponse;
}

// ─── Address prediction ───────────────────────────────────────────────────────

async function predictAddress(
  rpcUrl: string,
  networkPassphrase: string,
  factoryAddress: string,
  paramsMap: xdr.ScVal,
): Promise<string> {
  const seed = QuickCrypto.randomBytes(32) as unknown as Buffer;
  const dummyAccount = new Account(Keypair.fromRawEd25519Seed(seed).publicKey(), '0');
  const factory = new Contract(factoryAddress);

  const tx = new TransactionBuilder(dummyAccount, { fee: '100', networkPassphrase })
    .addOperation(factory.call('get_account_address', paramsMap))
    .setTimeout(30)
    .build();

  const txXdr = txToBase64(tx);
  console.log(
    '[passkey] predictAddress txXdr length:',
    txXdr.length,
    'prefix:',
    txXdr.slice(0, 20),
  );

  const raw = await sorobanCall(rpcUrl, 'simulateTransaction', { transaction: txXdr });
  if (raw.error) throw new Error(`get_account_address simulation failed: ${raw.error}`);

  const retval = xdr.ScVal.fromXDR(raw.results?.[0]?.retval, 'base64');
  return scValToNative(retval);
}

// ─── Public types & API ───────────────────────────────────────────────────────

export interface DeployResult {
  smartAccountAddress: string;
  alreadyDeployed: boolean;
  error?: string;
}

export interface LookupResult {
  deployed: boolean;
  smartAccountAddress: string;
}

export async function deploySmartAccount(
  credentialId: string,
  keyDataHex: string,
): Promise<DeployResult> {
  try {
    if (!keyDataHex || keyDataHex.length < 132) {
      return { smartAccountAddress: '', alreadyDeployed: false, error: 'keyDataHex too short' };
    }

    const config = getConfig();
    const { rpcUrl, horizonUrl, networkPassphrase, factoryAddress, bundlerSecret } = config;

    if (!factoryAddress || !bundlerSecret) {
      return {
        smartAccountAddress: '',
        alreadyDeployed: false,
        error: 'EXPO_PUBLIC_FACTORY_ADDRESS or EXPO_PUBLIC_BUNDLER_SECRET not set',
      };
    }

    const cached = cache.get(credentialId);
    if (cached) return { smartAccountAddress: cached, alreadyDeployed: true };

    const salt = deriveSalt(keyDataHex);
    const paramsMap = buildParamsMap(keyDataHex, salt);
    const factory = new Contract(factoryAddress);
    const bundlerKeypair = Keypair.fromSecret(bundlerSecret);

    // Quick health probe — distinguishes "testnet down" from "app can't reach network"
    await sorobanCall(rpcUrl, 'getHealth', {});
    console.log('[passkey] RPC reachable, bundler:', bundlerKeypair.publicKey());

    const predictedAddress = await predictAddress(
      rpcUrl,
      networkPassphrase,
      factoryAddress,
      paramsMap,
    );
    console.log('[passkey] predicted:', predictedAddress);

    const bundlerAccount = await getAccount(horizonUrl, bundlerKeypair.publicKey());
    console.log('[passkeyppp] bundler seq:', bundlerAccount.sequenceNumber());

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
    console.log('[passkey] simulation ok');

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

    const txHash = sendRaw.hash;
    let smartAccountAddress: string | undefined;

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await sorobanCall(rpcUrl, 'getTransaction', { hash: txHash });
      console.log(`[passkey] poll ${i + 1}: ${poll.status}`);

      if (poll.status === 'NOT_FOUND') continue;

      if (poll.status === 'SUCCESS') {
        if (poll.returnValue) {
          smartAccountAddress = scValToNative(xdr.ScVal.fromXDR(poll.returnValue, 'base64'));
        }
        break;
      }

      throw new Error(`Deployment failed with status: ${poll.status}`);
    }

    if (!smartAccountAddress) smartAccountAddress = predictedAddress;

    if (smartAccountAddress !== predictedAddress) {
      throw new Error(
        `Address mismatch: predicted=${predictedAddress} actual=${smartAccountAddress}`,
      );
    }

    cache.set(credentialId, smartAccountAddress);
    return { smartAccountAddress, alreadyDeployed: false };
  } catch (error: any) {
    console.error('[passkey] deploySmartAccount error:', error);
    return {
      smartAccountAddress: '',
      alreadyDeployed: false,
      error: error?.message ?? 'Deployment failed',
    };
  }
}

export async function lookupSmartAccount(
  credentialId: string,
  keyDataHex: string,
): Promise<LookupResult> {
  try {
    if (!keyDataHex || keyDataHex.length < 132) return { deployed: false, smartAccountAddress: '' };

    const cached = cache.get(credentialId);
    if (cached) return { deployed: true, smartAccountAddress: cached };

    const config = getConfig();
    const { rpcUrl, networkPassphrase, factoryAddress } = config;
    if (!factoryAddress) return { deployed: false, smartAccountAddress: '' };

    const salt = deriveSalt(keyDataHex);
    const paramsMap = buildParamsMap(keyDataHex, salt);
    const predictedAddress = await predictAddress(
      rpcUrl,
      networkPassphrase,
      factoryAddress,
      paramsMap,
    );

    const instanceKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: new Address(predictedAddress).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      }),
    );

    const raw = await sorobanCall(rpcUrl, 'getLedgerEntries', {
      keys: [ledgerKeyToBase64(instanceKey)],
    });

    const deployed = (raw.entries?.length ?? 0) > 0;
    if (deployed) cache.set(credentialId, predictedAddress);
    return { deployed, smartAccountAddress: predictedAddress };
  } catch (error: any) {
    console.error('[passkey] lookupSmartAccount error:', error);
    return { deployed: false, smartAccountAddress: '' };
  }
}
