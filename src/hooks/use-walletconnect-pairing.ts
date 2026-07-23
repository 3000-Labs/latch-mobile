import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { pairWithUri, walletKit } from '@/src/lib/walletconnect';
import { useWalletConnectStore } from '@/src/store/walletconnect';

const PAIRING_TIMEOUT_MS = 15_000;

// Shared by the QR scan screen and the WalletConnect deep-link listener so both
// entry points into pairing show the same validation/timeout/error behavior.
export function useWalletConnectPairing() {
  const [isPairing, setIsPairing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProposal = useWalletConnectStore((s) => s.pendingProposal);

  const clearPairingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetPairing = useCallback(() => {
    clearPairingTimeout();
    setIsPairing(false);
  }, [clearPairingTimeout]);

  // The proposal landing in the store is the real "pairing succeeded" signal —
  // pairWithUri only resolves once the request is sent. Without this the timer
  // keeps running through a successful pair and fires a false "can't reach the
  // relay" alert; on the deep-link path (whose hook lives in the root layout and
  // never blurs) nothing else would ever clear it.
  useEffect(() => {
    if (pendingProposal) {
      clearPairingTimeout();
      setIsPairing(false);
    }
  }, [pendingProposal, clearPairingTimeout]);

  const pair = useCallback(
    async (uri: string) => {
      if (!uri.startsWith('wc:')) {
        Alert.alert('Invalid URL', 'Please paste a valid WalletConnect URI starting with wc:');
        return;
      }

      const net = await NetInfo.fetch();
      if (!net.isConnected || !net.isInternetReachable) {
        Alert.alert('No internet', 'Connect to the internet before pairing with WalletConnect.');
        return;
      }

      setIsPairing(true);
      timeoutRef.current = setTimeout(() => {
        setIsPairing(false);
        // Distinguishes "socket never came up" from "socket is fine, the dApp's
        // proposal just never arrived" — the two have very different causes.
        const relayConnected = walletKit?.core.relayer.connected ?? false;
        console.warn(
          `[WalletConnect] pairing timed out after ${PAIRING_TIMEOUT_MS}ms — relayer.connected=${relayConnected}`,
        );
        Alert.alert(
          'Connection failed',
          relayConnected
            ? "Connected to the relay, but the dApp's connection request never arrived. The QR code may have expired — generate a new one and try again."
            : 'Unable to reach the relay server. Check your internet connection and try again.',
        );
      }, PAIRING_TIMEOUT_MS);

      try {
        await pairWithUri(uri);
        // pairWithUri resolves once the request is sent; the session_proposal event
        // fires asynchronously in use-walletconnect.ts and lands in the store —
        // the effect above clears the timeout when it does.
      } catch (e: any) {
        clearPairingTimeout();
        setIsPairing(false);
        Alert.alert('WalletConnect', e?.message ?? 'Failed to pair');
      }
    },
    [clearPairingTimeout],
  );

  return { isPairing, pair, clearPairingTimeout, resetPairing };
}
