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
  Asset,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { sorobanCall, txToBase64 } from './smart-account';

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

    // 2. Derive the transfer amount from the fresh Horizon fetch, not the discovery snapshot.
    // Balances can drift between discovery and sweep; a stale (too-large) amount fails simulation.
    let effectiveAmount = amountHuman;
    const balances: any[] = accountData.balances ?? [];
    const nativeXlmSacId = Asset.native().contractId(networkPassphrase);
    if (sacContractId === nativeXlmSacId) {
      const nativeBal = balances.find((b) => b.asset_type === 'native');
      // Stellar minimum balance: (2 + subentries) × 0.5 XLM
      const minBalanceXLM = (2 + (accountData.subentry_count ?? 0)) * 0.5;
      // 0.05 XLM covers declared fee (200k stroops) + up to 300k stroops resource fee
      const feeBufferXLM = 0.05;
      const freshTransferable = nativeBal
        ? Math.max(0, parseFloat(nativeBal.balance) - minBalanceXLM - feeBufferXLM)
        : 0;
      if (freshTransferable < 0.0001) {
        return { success: false, error: 'Insufficient XLM balance (base reserve + fees required)' };
      }
      effectiveAmount = freshTransferable.toFixed(7);
    } else {
      // Non-native token: find the matching trustline by computing each entry's SAC contract ID.
      const tokenBal = balances.find((b) => {
        if (b.asset_type !== 'credit_alphanum4' && b.asset_type !== 'credit_alphanum12') return false;
        try {
          return new Asset(b.asset_code, b.asset_issuer).contractId(networkPassphrase) === sacContractId;
        } catch {
          return false;
        }
      });
      if (tokenBal) {
        if (parseFloat(tokenBal.balance) < 0.0000001) {
          return { success: false, error: `No ${tokenBal.asset_code} balance to migrate` };
        }
        effectiveAmount = tokenBal.balance;
      }
    }

    const amountRaw = BigInt(Math.round(parseFloat(effectiveAmount) * 10 ** decimals));

    // 3. Build the SAC transfer invocation
    const contract = new Contract(sacContractId);
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '200000',
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

    if (rawSim.error) {
      const msg = String(rawSim.error);
      // Contract error #10 = "resulting balance is not within the allowed range"
      // This means the account balance changed since discovery — stale amount.
      if (msg.includes('Error(Contract, #10)') || msg.toLowerCase().includes('resulting balance')) {
        throw new Error('Insufficient balance — amounts may have changed. Go back and try again.');
      }
      throw new Error(`Simulation failed: ${msg}`);
    }

    // Soroban RPC omits transactionData when the SAC doesn't exist on this network.
    if (typeof rawSim.transactionData !== 'string') {
      throw new Error('Token SAC does not exist on this network — cannot transfer this asset.');
    }

    // 5. Assemble: attach auth + replace fee with resource fee from simulation.
    // Pass rawSim directly — assembleTransaction calls parseRawSimulation internally,
    // which requires auth entries to still be base64 strings. Pre-parsing them causes
    // a double-parse that corrupts the XDR (Buffer.from(object) type error).
    const assembled = rpc.assembleTransaction(tx, rawSim).build();

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
