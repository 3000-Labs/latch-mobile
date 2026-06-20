/**
 * useSmartAccountTransaction
 *
 * Manages the full build → sign → submit cycle for a Soroban transaction
 * authorised by the mobile wallet's Ed25519 keypair.
 *
 * Usage:
 *   const { txState, txHash, txError, execute, reset } = useSmartAccountTransaction();
 *   <Button onPress={() => execute(smartAccountAddress, publicKeyHex, keypair)} />
 */

import { useCallback, useState } from 'react';
import { Keypair } from '@stellar/stellar-sdk';
import {
  buildTransaction,
  signAuthDigest,
  submitTransaction,
} from '@/src/api/transaction';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TxState =
  | 'idle'
  | 'building'    // fetching unsigned tx + auth digest from backend
  | 'signing'     // signing locally with keypair
  | 'submitting'  // sending signed tx to backend for final submission
  | 'success'
  | 'error';

export interface TransactionResult {
  txState: TxState;
  txHash: string | null;
  txError: string | null;
  isBusy: boolean;
  /**
   * Run a full build → sign → submit cycle.
   * @param smartAccountAddress  Deployed C-address from SecureStore / wallet store
   * @param publicKeyHex         64-char hex Ed25519 public key
   * @param keypair              Full Stellar Keypair from seed wallet
   */
  execute: (
    smartAccountAddress: string,
    publicKeyHex: string,
    keypair: Keypair,
  ) => Promise<void>;
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSmartAccountTransaction(): TransactionResult {
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      smartAccountAddress: string,
      publicKeyHex: string,
      keypair: Keypair,
    ) => {
      setTxState('building');
      setTxHash(null);
      setTxError(null);

      try {
        // ── 1. Build ──────────────────────────────────────────────────────────
        const build = await buildTransaction(smartAccountAddress);

        // ── 2. Sign locally with Ed25519 keypair ──────────────────────────────
        setTxState('signing');
        const { prefixedMessage, authSignatureHex } = signAuthDigest(
          build.authDigestHex,
          keypair,
        );

        // ── 3. Submit ─────────────────────────────────────────────────────────
        setTxState('submitting');
        const result = await submitTransaction({
          txXdr: build.txXdr,
          authEntryXdr: build.authEntryXdr,
          prefixedMessage,
          authSignatureHex,
          publicKeyHex,
        });

        setTxHash(result.hash);
        setTxState('success');
      } catch (err: any) {
        setTxError(err?.message ?? 'Transaction failed');
        setTxState('error');
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setTxState('idle');
    setTxHash(null);
    setTxError(null);
  }, []);

  return {
    txState,
    txHash,
    txError,
    isBusy: txState === 'building' || txState === 'signing' || txState === 'submitting',
    execute,
    reset,
  };
}
