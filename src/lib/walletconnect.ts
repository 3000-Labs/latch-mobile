/**
 * walletconnect.ts — WalletKit singleton and approve/reject helpers.
 *
 * Supports stellar_signXDR (sign only) and stellar_signAndSubmitXDR (sign +
 * submit). Only mnemonic accounts are supported in v1 — passkey accounts have
 * no G-address for the WC namespace.
 *
 * Signing uses deriveWalletAtIndex so the keypair is never stored. XDR
 * serialisation uses txToBase64 (avoids the .toXDR('base64') Hermes bug).
 */

import { WalletKit, type IWalletKit, type WalletKitTypes } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { FeeBumpTransaction, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';

import { txToBase64 } from '@/src/api/smart-account';
import { ACTIVE_NETWORK, HORIZON_URL, STELLAR_NETWORK_PASSPHRASE } from '@/src/constants/config';
import { deriveWalletAtIndex } from '@/src/lib/seed-wallet';

export const WC_CHAIN =
  ACTIVE_NETWORK.network === 'TESTNET' ? 'stellar:testnet' : 'stellar:pubnet';

const WC_METHODS = ['stellar_signXDR', 'stellar_signAndSubmitXDR'];
const WC_EVENTS = ['accountsChanged'];

const PROJECT_ID = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

const METADATA = {
  name: 'Latch',
  description: 'Stellar Smart Account Wallet',
  url: 'https://getlatch.co',
  icons: ['https://getlatch.co/icon.png'],
  redirect: { native: 'latch://' },
};

export let walletKit: IWalletKit | null = null;

export async function initWalletKit(): Promise<void> {
  if (walletKit) return;
  const core = new Core({ projectId: PROJECT_ID });
  walletKit = await WalletKit.init({ core, metadata: METADATA });
}

export function pairWithUri(uri: string): Promise<void> {
  if (!walletKit) throw new Error('WalletKit not initialised');
  return walletKit.pair({ uri });
}

export async function approveProposal(
  proposal: WalletKitTypes.SessionProposal,
  gAddress: string,
): Promise<void> {
  if (!walletKit) throw new Error('WalletKit not initialised');
  const { id, params } = proposal;
  const namespaces = buildApprovedNamespaces({
    proposal: params,
    supportedNamespaces: {
      stellar: {
        chains: [WC_CHAIN],
        accounts: [`${WC_CHAIN}:${gAddress}`],
        methods: WC_METHODS,
        events: WC_EVENTS,
      },
    },
  });
  await walletKit.approveSession({ id, namespaces });
}

export async function rejectProposal(id: number): Promise<void> {
  if (!walletKit) throw new Error('WalletKit not initialised');
  await walletKit.rejectSession({ id, reason: getSdkError('USER_REJECTED') });
}

export async function approveSignRequest(
  request: WalletKitTypes.SessionRequest,
  mnemonic: string,
  accountIndex: number,
): Promise<void> {
  if (!walletKit) throw new Error('WalletKit not initialised');
  const { id, topic, params } = request;
  const {
    request: { method, params: reqParams },
    chainId,
  } = params;

  if (chainId !== WC_CHAIN) {
    await walletKit.respondSessionRequest({
      topic,
      response: { id, jsonrpc: '2.0', error: getSdkError('UNSUPPORTED_CHAINS') },
    });
    return;
  }

  const { xdr } = reqParams as { xdr: string };
  const { keypair } = deriveWalletAtIndex(mnemonic, accountIndex);

  let tx: Transaction | FeeBumpTransaction;
  try {
    tx = TransactionBuilder.fromXDR(xdr, STELLAR_NETWORK_PASSPHRASE);
  } catch {
    await walletKit.respondSessionRequest({
      topic,
      response: { id, jsonrpc: '2.0', error: getSdkError('INVALID_METHOD') },
    });
    return;
  }

  tx.sign(keypair);
  const signedXdr = txToBase64(tx);

  if (method === 'stellar_signXDR') {
    await walletKit.respondSessionRequest({
      topic,
      response: { id, jsonrpc: '2.0', result: { signedXDR: signedXdr } },
    });
    return;
  }

  // stellar_signAndSubmitXDR — sign + submit to Horizon
  await submitToHorizon(signedXdr);
  await walletKit.respondSessionRequest({
    topic,
    response: { id, jsonrpc: '2.0', result: { status: 'success' } },
  });
}

export async function rejectSignRequest(request: WalletKitTypes.SessionRequest): Promise<void> {
  if (!walletKit) throw new Error('WalletKit not initialised');
  const { id, topic } = request;
  await walletKit.respondSessionRequest({
    topic,
    response: { id, jsonrpc: '2.0', error: getSdkError('USER_REJECTED') },
  });
}

function submitToHorizon(signedXdr: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${HORIZON_URL}/transactions`, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.timeout = 30_000;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText);
        reject(new Error(body?.extras?.result_codes?.transaction ?? `HTTP ${xhr.status}`));
      } catch {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Request timed out'));
    xhr.send(`tx=${encodeURIComponent(signedXdr)}`);
  });
}

export function getActiveSessions() {
  if (!walletKit) return {};
  return walletKit.getActiveSessions();
}

export async function disconnectSession(topic: string): Promise<void> {
  if (!walletKit) return;
  await walletKit.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') });
}
