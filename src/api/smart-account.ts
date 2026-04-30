/**
 * Smart account API service.
 *
 * Wraps the latch backend endpoints for deploying and looking up
 * Soroban smart accounts. All heavy protocol work (bundler signing,
 * Soroban RPC simulation, contract deployment) runs server-side.
 *
 * Ed25519 path (mobile seed wallet):
 *   POST /api/smart-account/factory  { publicKeyHex }
 *   GET  /api/smart-account/factory?pubkey=<hex>
 *
 * Freighter / delegated G-address path:
 *   POST /api/smart-account/freighter  { gAddress }
 *   GET  /api/smart-account/freighter?gAddress=...
 */

import {
  Account,
  Address,
  Contract,
  Keypair,
  Networks,
  rpc,
  scValToNative,
  StrKey,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import QuickCrypto from 'react-native-quick-crypto';

// ─── XHR-based JSON-RPC ───────────────────────────────────────────────────────
// The stellar SDK uses Axios internally, which fails with "Network Error" on
// Android because the bundled Axios doesn't go through the platform TLS stack.
// Using XMLHttpRequest directly routes through OkHttp and respects the
// network_security_config.xml trust anchors.

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function txToBase64(tx: { toEnvelope(): { toXDR(): Uint8Array } }): string {
  return toBase64(new Uint8Array(tx.toEnvelope().toXDR()));
}

function ledgerKeyToBase64(key: xdr.LedgerKey): string {
  return toBase64(new Uint8Array(key.toXDR()));
}

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

function extractAddressFromMeta(resultMetaXdr: string): string | undefined {
  try {
    const meta = xdr.TransactionMeta.fromXDR(resultMetaXdr, 'base64');
    //@ts-ignore - the SDK types don't reflect the v4 meta changes yet
    const arm = meta.arm();
    let sorobanMeta: any;
    if (arm === 'v3') sorobanMeta = meta.v3().sorobanMeta();
    else if (arm === 'v4') sorobanMeta = (meta as any).v4().sorobanMeta();
    if (sorobanMeta) return scValToNative(sorobanMeta.returnValue());
  } catch (e) {
    console.warn('Could not parse address from resultMetaXdr:', e);
  }
  return undefined;
}

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

// Load configuration from environment variables
// Define configuration lazily using getters so we don't crash at module initialization
const getTestnetConfig = () => ({
  rpcUrl: process.env.EXPO_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  networkPassphrase: process.env.EXPO_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET,
  factoryAddress: process.env.EXPO_PUBLIC_FACTORY_ADDRESS,
  bundlerSecret: process.env.EXPO_PUBLIC_BUNDLER_SECRET,
});

const cache: Map<string, string> = new Map();

// In-memory cache
const deployedAccounts: Map<string, { smartAccountAddress: string; gAddress: string }> = new Map();

async function deriveSalt(publicKeyHex: string): Promise<Buffer> {
  const SMART_ACCOUNT_VERSION = 'factory-v2';
  const saltHex = QuickCrypto.createHash('sha256')
    .update(publicKeyHex + SMART_ACCOUNT_VERSION)
    .digest('hex');
  return Buffer.from(saltHex, 'hex');
}

// Shared: builds the AccountInitParams ScVal map
function buildParamsMap(publicKeyHex: string, salt: Buffer): xdr.ScVal {
  // ExternalSignerInit struct — fields must be in alphabetical key order (Soroban map encoding)
  const externalSignerInit = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('key_data'),
      val: xdr.ScVal.scvBytes(Buffer.from(publicKeyHex, 'hex')),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('signer_kind'),
      // SignerKind::Ed25519 — unit enum variant: Vec([Symbol("Ed25519")])
      val: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Ed25519')]),
    }),
  ]);

  // AccountSignerInit::External(ExternalSignerInit) — tuple enum variant: Vec([Symbol("External"), payload])
  const accountSigner = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('External'), externalSignerInit]);

  // AccountInitParams struct — fields in alphabetical key order
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('account_salt'),
      val: xdr.ScVal.scvBytes(salt),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('signers'),
      val: xdr.ScVal.scvVec([accountSigner]),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('threshold'),
      val: xdr.ScVal.scvVoid(),
    }),
  ]);
}
function deriveGAddressFromPubkey(pubkeyHex: string): string {
  try {
    const pubkeyBytes = Buffer.from(pubkeyHex, 'hex');
    return StrKey.encodeEd25519PublicKey(pubkeyBytes);
  } catch (err) {
    console.error('Error deriving G-address:', err);
    throw new Error(
      `Failed to derive G-address from pubkey: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function fundAccountIfNeeded(gAddress: string): Promise<void> {
  try {
    const horizonResponse = await fetch(`https://horizon-testnet.stellar.org/accounts/${gAddress}`);
    if (horizonResponse.ok) return;
  } catch (err) {}

  console.log(`Funding account ${gAddress} via Friendbot...`);
  const response = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(gAddress)}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fund account: ${response.statusText}`);
  }
}

// rpc.Server.getAccount() uses getLedgerEntries on the Soroban RPC, which can
// return empty even when the account exists. Horizon is authoritative for sequence.
async function getAccountFromHorizon(publicKey: string): Promise<Account> {
  const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
  if (!response.ok) throw new Error(`Account not found: ${publicKey}`);
  const data = await response.json();
  return new Account(publicKey, data.sequence);
}

async function predictAddress(
  rpcUrl: string,
  networkPassphrase: string,
  factoryAddress: string,
  paramsMap: xdr.ScVal,
): Promise<string> {
  const dummyKp = Keypair.random();
  const dummyAccount = new Account(dummyKp.publicKey(), '0');
  const factory = new Contract(factoryAddress);

  const tx = new TransactionBuilder(dummyAccount, { fee: '100', networkPassphrase })
    .addOperation(factory.call('get_account_address', paramsMap))
    .setTimeout(30)
    .build();

  const raw = await sorobanCall(rpcUrl, 'simulateTransaction', { transaction: txToBase64(tx) });
  if (raw.error) throw new Error(`get_account_address simulation failed: ${raw.error}`);

  const retval = xdr.ScVal.fromXDR(raw.results?.[0]?.retval ?? 'AAAAAA==', 'base64');
  return scValToNative(retval);
}

export interface DeployResult {
  smartAccountAddress: string;
  gAddress?: string;
  factoryAddress?: string;
  alreadyDeployed: boolean;
}

export interface LookupResult {
  deployed: boolean;
  smartAccountAddress: string;
}

// ─── Ed25519 (seed-wallet) path ───────────────────────────────────────────────

/**
 * Deploy a smart account using an Ed25519 public key from the seed wallet.
 *
 * @param publicKeyHex  64-char hex string — the raw Ed25519 public key
 */
export async function deploySmartAccount(publicKeyHex: string): Promise<DeployResult> {
  try {
    const userGAddress = deriveGAddressFromPubkey(publicKeyHex);

    if (deployedAccounts.has(publicKeyHex)) {
      const cached = deployedAccounts.get(publicKeyHex)!;
      return {
        smartAccountAddress: cached.smartAccountAddress,
        gAddress: cached.gAddress,
        alreadyDeployed: true,
      };
    }

    await fundAccountIfNeeded(userGAddress);

    console.log(`Deploying smart account for pubkey: ${publicKeyHex}`);

    const config = getTestnetConfig();

    if (!config.bundlerSecret) {
      throw new Error(
        'EXPO_PUBLIC_BUNDLER_SECRET environment variable is required and currently missing from .env.',
      );
    }
    if (!config.factoryAddress) {
      throw new Error('Missing EXPO_PUBLIC_FACTORY_ADDRESS in environment variables.');
    }

    const bundlerKeypair = Keypair.fromSecret(config.bundlerSecret);

    const salt = await deriveSalt(publicKeyHex);
    const paramsMap = buildParamsMap(publicKeyHex, salt);
    const contract = new Contract(config.factoryAddress);
    const bundlerAccount = await getAccountFromHorizon(bundlerKeypair.publicKey());

    let smartAccountAddress: string = '';

    const deployTx = new TransactionBuilder(bundlerAccount, {
      fee: '1500000',
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call('create_account', paramsMap))
      .setTimeout(300)
      .build();

    console.log('Simulating factory create_account...');
    const rawSim = await sorobanCall(config.rpcUrl, 'simulateTransaction', {
      transaction: txToBase64(deployTx),
    });
    if (rawSim.error) throw new Error(`Factory deployment simulation failed: ${rawSim.error}`);

    try {
      smartAccountAddress = scValToNative(
        xdr.ScVal.fromXDR(rawSim.results?.[0]?.retval || 'AAAAAA==', 'base64'),
      );
      console.log(`Simulation preview. Predicted Account: ${smartAccountAddress}`);
    } catch {
      console.log('Could not pre-read address from simulation — will parse from settled tx.');
    }

    const assembledTx = rpc.assembleTransaction(deployTx, parseSimResult(rawSim)).build();
    assembledTx.sign(bundlerKeypair);

    const sendRaw = await sorobanCall(config.rpcUrl, 'sendTransaction', {
      transaction: txToBase64(assembledTx),
    });

    if (sendRaw.status === 'ERROR') {
      throw new Error(
        `Factory deployment failed: ${sendRaw.errorResultXdr ?? JSON.stringify(sendRaw)}`,
      );
    }

    const txHash: string = sendRaw.hash;
    let finalStatus: string | undefined;
    let returnValueXdr: string | undefined;

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await sorobanCall(config.rpcUrl, 'getTransaction', { hash: txHash });
      finalStatus = poll.status;
      if (poll.status !== 'NOT_FOUND') {
        returnValueXdr = poll.resultMetaXdr;
        break;
      }
    }

    if (!finalStatus) throw new Error('Transaction not found after polling');

    if (finalStatus === 'SUCCESS') {
      if (returnValueXdr) {
        smartAccountAddress = extractAddressFromMeta(returnValueXdr) ?? '';
      }
      console.log(`Deployment successful via factory: ${smartAccountAddress}`);
    } else {
      throw new Error(`Factory deployment transaction status: ${finalStatus}`);
    }
    //
    deployedAccounts.set(publicKeyHex, {
      smartAccountAddress: smartAccountAddress!,
      gAddress: userGAddress,
    });

    return {
      smartAccountAddress: smartAccountAddress!,
      gAddress: userGAddress,
      factoryAddress: config.factoryAddress!,
      alreadyDeployed: false,
    };
  } catch (error) {
    console.error('Error creating via factory:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to deploy smart account via factory';
    const errorStack = error instanceof Error ? error.stack : undefined;
    throw error instanceof Error ? error : new Error(String(errorMessage));
  }
}

/**
 * Look up whether a smart account already exists for the given Ed25519 public key.
 *
 * @param publicKeyHex  64-char hex string — the raw Ed25519 public key
 */
export async function lookupSmartAccount(publicKeyHex: string): Promise<LookupResult> {
  try {
    if (!publicKeyHex || publicKeyHex.length !== 64) {
      throw new Error('Missing or invalid pubkey query param (expected 64-char hex).');
    }

    const config = getTestnetConfig();
    if (!config.factoryAddress) {
      return { deployed: false, smartAccountAddress: '' };
    }

    // Check in-memory cache first (fast path)
    if (deployedAccounts.has(publicKeyHex)) {
      const cached = deployedAccounts.get(publicKeyHex)!;
      return { deployed: true, smartAccountAddress: cached.smartAccountAddress };
    }

    const salt = await deriveSalt(publicKeyHex);
    const params = buildParamsMap(publicKeyHex, salt);
    const predictedAddress = await predictAddress(
      config.rpcUrl,
      config.networkPassphrase,
      config.factoryAddress,
      params,
    );

    const instanceLedgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: new Address(predictedAddress).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      }),
    );

    const raw = await sorobanCall(config.rpcUrl, 'getLedgerEntries', {
      keys: [ledgerKeyToBase64(instanceLedgerKey)],
    });
    const entries = raw.entries ?? [];
    const deployed = entries.length > 0;

    if (deployed) {
      // Populate cache so POST can fast-path on subsequent calls
      const gAddress = deriveGAddressFromPubkey(publicKeyHex);
      deployedAccounts.set(publicKeyHex, { smartAccountAddress: predictedAddress, gAddress });
    }

    return { deployed, smartAccountAddress: predictedAddress };
  } catch (error) {
    console.error('Error looking up smart account:', error);
    return { deployed: false, smartAccountAddress: '' };
  }
}

// ─── G-address / Freighter (delegated) path ───────────────────────────────────

/**
 * Deploy a smart account using a Stellar G-address as a delegated signer.
 *
 * @param gAddress  Stellar G-address (e.g., "GABC...")
 */
export async function deploySmartAccountForGAddress(gAddress: string): Promise<DeployResult> {
  try {
    if (!gAddress || typeof gAddress !== 'string' || !StrKey.isValidEd25519PublicKey(gAddress)) {
      return { smartAccountAddress: '', gAddress: '', alreadyDeployed: false, factoryAddress: '' };
    }

    if (cache.has(gAddress)) {
      return { smartAccountAddress: cache.get(gAddress) || '', alreadyDeployed: true };
    }

    await fundAccountIfNeeded(gAddress);

    const cfg = getTestnetConfig();
    const bundlerKeypair = Keypair.fromSecret(cfg.bundlerSecret || '');
    const salt = await deriveSalt(gAddress);
    const paramsMap = buildParamsMap(gAddress, salt);
    const factory = new Contract(cfg.factoryAddress || '');

    const predictedAddress = await predictAddress(
      cfg.rpcUrl,
      cfg.networkPassphrase,
      cfg.factoryAddress || '',
      paramsMap,
    );

    const bundlerAccount = await getAccountFromHorizon(bundlerKeypair.publicKey());

    const createTx = new TransactionBuilder(bundlerAccount, {
      fee: '1500000',
      networkPassphrase: cfg.networkPassphrase,
    })
      .addOperation(factory.call('create_account', paramsMap))
      .setTimeout(300)
      .build();

    const rawSim = await sorobanCall(cfg.rpcUrl, 'simulateTransaction', {
      transaction: txToBase64(createTx),
    });
    if (rawSim.error) throw new Error(`create_account simulation failed: ${rawSim.error}`);

    const assembled = rpc.assembleTransaction(createTx, parseSimResult(rawSim)).build();
    assembled.sign(bundlerKeypair);

    const sendRaw = await sorobanCall(cfg.rpcUrl, 'sendTransaction', {
      transaction: txToBase64(assembled),
    });
    if (sendRaw.status === 'ERROR') {
      throw new Error(
        `Factory create_account failed: ${sendRaw.errorResultXdr ?? JSON.stringify(sendRaw)}`,
      );
    }

    let smartAccountAddress: string | undefined;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await sorobanCall(cfg.rpcUrl, 'getTransaction', { hash: sendRaw.hash });
      if (poll.status === 'NOT_FOUND') continue;
      if (poll.status === 'SUCCESS') {
        if (poll.resultMetaXdr) smartAccountAddress = extractAddressFromMeta(poll.resultMetaXdr);
        break;
      }
      throw new Error(`Factory deployment failed with status: ${poll.status}`);
    }

    if (!smartAccountAddress) smartAccountAddress = predictedAddress;
    if (smartAccountAddress !== predictedAddress) {
      throw new Error(
        `Address mismatch: predicted=${predictedAddress} actual=${smartAccountAddress}`,
      );
    }

    cache.set(gAddress, smartAccountAddress);
    return { smartAccountAddress, alreadyDeployed: false };
  } catch (error) {
    console.error('Freighter account deploy error:', error);
    return {
      smartAccountAddress: '',
      gAddress: '',
      alreadyDeployed: false,
      factoryAddress: '',
    };
  }
}

/**
 * Look up whether a smart account already exists for the given G-address.
 *
 * @param gAddress  Stellar G-address
 */
export async function lookupSmartAccountByGAddress(gAddress: string): Promise<LookupResult> {
  try {
    if (!gAddress || !StrKey.isValidEd25519PublicKey(gAddress)) {
      return { deployed: false, smartAccountAddress: '' };
    }

    if (cache.has(gAddress)) {
      return { deployed: true, smartAccountAddress: cache.get(gAddress) || '' };
    }

    const config = getTestnetConfig();
    if (!config.factoryAddress) {
      return { deployed: false, smartAccountAddress: '' };
    }

    const salt = await deriveSalt(gAddress);
    const paramsMap = buildParamsMap(gAddress, salt);
    const predictedAddress = await predictAddress(
      config.rpcUrl,
      config.networkPassphrase,
      config.factoryAddress,
      paramsMap,
    );

    const instanceKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: new Address(predictedAddress).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      }),
    );
    const raw = await sorobanCall(config.rpcUrl, 'getLedgerEntries', {
      keys: [ledgerKeyToBase64(instanceKey)],
    });
    const deployed = (raw.entries?.length ?? 0) > 0;
    if (deployed) cache.set(gAddress, predictedAddress);

    return { deployed, smartAccountAddress: predictedAddress };
  } catch (error) {
    console.error('Freighter account lookup error:', error);
    return { deployed: false, smartAccountAddress: '' };
  }
}
