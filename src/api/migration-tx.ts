/**
 * Migration transaction builder.
 *
 * Builds and submits a Soroban SAC transfer from the G-address (classic) to the
 * smart account C-address. Each asset requires its own transaction because
 * Stellar allows only one InvokeHostFunction operation per transaction.
 *
 * Uses the XHR-based sorobanCall() transport — NOT Axios — to avoid the Android
 * TLS failure on Soroban JSON-RPC calls.
 */

import {
  Account,
  Address,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { parseSimResult, sorobanCall, txToBase64 } from './smart-account';

export interface SacTransferParams {
  sacContractId: string;
  fromGAddress: string;
  toCAddress: string;
  /** Human-readable amount, e.g. '124.7499975' */
  amountHuman: string;
  /** Decimal places — 7 for XLM and most Stellar tokens */
  decimals: number;
  keypair: Keypair;
  rpcUrl: string;
  networkPassphrase: string;
  horizonUrl: string;
}

/**
 * Build, sign, submit, and poll a single SAC token::transfer transaction.
 * The G-address keypair signs; the transaction is submitted via Soroban RPC.
 */
export async function buildAndSubmitSacTransfer(
  params: SacTransferParams,
): Promise<{ success: boolean; error?: string }> {
  const {
    sacContractId,
    fromGAddress,
    toCAddress,
    amountHuman,
    decimals,
    keypair,
    rpcUrl,
    networkPassphrase,
    horizonUrl,
  } = params;

  try {
    // 1. Fetch source account sequence number from Horizon
    const accountResp = await fetch(`${horizonUrl}/accounts/${fromGAddress}`);
    if (!accountResp.ok) throw new Error(`Could not load account: HTTP ${accountResp.status}`);
    const accountData = await accountResp.json();
    const sourceAccount = new Account(fromGAddress, accountData.sequence);

    // 2. Convert human-readable amount to raw integer (stroops / base units)
    const amountRaw = BigInt(Math.round(parseFloat(amountHuman) * 10 ** decimals));

    // 3. Build the SAC transfer invocation
    const contract = new Contract(sacContractId);
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '1500000',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'transfer',
          new Address(fromGAddress).toScVal(),
          new Address(toCAddress).toScVal(),
          nativeToScVal(amountRaw, { type: 'i128' }),
        ),
      )
      .setTimeout(300)
      .build();

    // 4. Simulate to get auth entries + resource fees
    const rawSim = await sorobanCall(rpcUrl, 'simulateTransaction', {
      transaction: txToBase64(tx),
    });

    // 5. Assemble: attach auth + replace fee with resource fee from simulation
    const assembled = rpc.assembleTransaction(tx, parseSimResult(rawSim)).build();

    // 6. Sign with the G-address Ed25519 keypair
    assembled.sign(keypair);

    // 7. Submit
    const sendRaw = await sorobanCall(rpcUrl, 'sendTransaction', {
      transaction: txToBase64(assembled),
    });

    if (sendRaw.status === 'ERROR') {
      throw new Error(`Transaction rejected: ${sendRaw.errorResultXdr ?? JSON.stringify(sendRaw)}`);
    }

    // 8. Poll until settled (SUCCESS or FAILED)
    const txHash: string = sendRaw.hash;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await sorobanCall(rpcUrl, 'getTransaction', { hash: txHash });
      if (poll.status === 'SUCCESS') return { success: true };
      if (poll.status === 'FAILED') {
        return { success: false, error: `Transaction failed: ${poll.resultXdr ?? poll.status}` };
      }
      // NOT_FOUND → still propagating, keep polling
    }

    return { success: false, error: 'Transaction timed out after 30 seconds' };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Unknown error' };
  }
}
