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
// import * as crypto from 'crypto';
import QuickCrypto from 'react-native-quick-crypto';

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
  server: rpc.Server,
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

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`get_account_address simulation failed: ${sim.error}`);
  }
  return scValToNative(sim.result!.retval);
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

    const server = new rpc.Server(config.rpcUrl);
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
    const simResult = await server.simulateTransaction(deployTx);

    if (rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Factory deployment simulation failed: ${simResult.error}`);
    }

    // The simulation succeeded — extract the Smart Account address from the sim result.
    // scValToNative correctly handles scvAddress ScVal types, returning the C-address string.
    try {
      const returnValNative = scValToNative(simResult.result!.retval);
      smartAccountAddress = returnValNative;
      console.log(`Simulation preview. Predicted Account: ${smartAccountAddress}`);
    } catch (e) {
      console.log('Could not pre-read address from simulation — will parse from settled tx.');
    }

    const assembledTx = rpc.assembleTransaction(deployTx, simResult).build();
    assembledTx.sign(bundlerKeypair);

    const deployResult = await server.sendTransaction(assembledTx);

    if (deployResult.status === 'ERROR') {
      throw new Error(`Factory deployment failed: ${deployResult.errorResult?.toXDR('base64')}`);
    }

    let deployTxResult: rpc.Api.GetTransactionResponse | undefined;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      deployTxResult = await server.getTransaction(deployResult.hash);
      if (deployTxResult.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
        break;
      }
    }

    if (!deployTxResult) throw new Error('Transaction not found after polling');

    if (deployTxResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      const result = deployTxResult as rpc.Api.GetSuccessfulTransactionResponse;
      if (result.returnValue) {
        // Use scValToNative — the factory returns a Soroban Address ScVal
        smartAccountAddress = scValToNative(result.returnValue);
      }
      console.log(`Deployment successful via factory: ${smartAccountAddress}`);
    } else {
      throw new Error(`Factory deployment transaction status: ${deployTxResult.status}`);
    }

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

    const server = new rpc.Server(config.rpcUrl);
    const salt = await deriveSalt(publicKeyHex);
    const params = buildParamsMap(publicKeyHex, salt);

    // Simulate get_account_address — pure read, costs nothing
    // Use a random throwaway keypair as the tx source (same pattern as /api/counter)
    const dummyKp = Keypair.random();
    const dummyAccount = new Account(dummyKp.publicKey(), '0');
    const contract = new Contract(config.factoryAddress);
    const lookupTx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call('get_account_address', params))
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(lookupTx);

    if (rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Address lookup simulation failed: ${simResult.error}`);
    }

    const predictedAddress: string = scValToNative(simResult.result!.retval);

    // Check whether the contract instance ledger entry exists at that address
    // ContractData(contract, ScvLedgerKeyContractInstance, Persistent) is the instance key.
    const instanceLedgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: new Address(predictedAddress).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      }),
    );

    const { entries } = await server.getLedgerEntries(instanceLedgerKey);
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

    const server = new rpc.Server(getTestnetConfig().rpcUrl);
    const bundlerKeypair = Keypair.fromSecret(getTestnetConfig().bundlerSecret || '');
    const salt = await deriveSalt(gAddress);
    const paramsMap = buildParamsMap(gAddress, salt);
    const factory = new Contract(getTestnetConfig().factoryAddress || '');

    const predictedAddress = await predictAddress(
      server,
      getTestnetConfig().networkPassphrase,
      getTestnetConfig().factoryAddress || '',
      paramsMap,
    );

    const bundlerAccount = await getAccountFromHorizon(bundlerKeypair.publicKey());

    const createTx = new TransactionBuilder(bundlerAccount, {
      fee: '1500000',
      networkPassphrase: getTestnetConfig().networkPassphrase,
    })
      .addOperation(factory.call('create_account', paramsMap))
      .setTimeout(300)
      .build();

    const sim = await server.simulateTransaction(createTx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`create_account simulation failed: ${sim.error}`);
    }

    const assembled = rpc.assembleTransaction(createTx, sim).build();
    assembled.sign(bundlerKeypair);

    const sendResult = await server.sendTransaction(assembled);
    if (sendResult.status === 'ERROR') {
      throw new Error(`Factory create_account failed: ${sendResult.errorResult?.toXDR('base64')}`);
    }

    let smartAccountAddress: string | undefined;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const txResult = await server.getTransaction(sendResult.hash);
      if (txResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND) continue;
      if (txResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        const success = txResult as rpc.Api.GetSuccessfulTransactionResponse;
        if (success.returnValue) smartAccountAddress = scValToNative(success.returnValue);
        break;
      }
      throw new Error(`Factory deployment failed with status: ${txResult.status}`);
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

    const server = new rpc.Server(config.rpcUrl);
    const salt = await deriveSalt(gAddress);
    const paramsMap = buildParamsMap(gAddress, salt);
    const predictedAddress = await predictAddress(
      server,
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
    const { entries } = await server.getLedgerEntries(instanceKey);
    const deployed = entries.length > 0;
    if (deployed) cache.set(gAddress, predictedAddress);

    return { deployed, smartAccountAddress: predictedAddress };
  } catch (error) {
    console.error('Freighter account lookup error:', error);
    return { deployed: false, smartAccountAddress: '' };
  }
}
