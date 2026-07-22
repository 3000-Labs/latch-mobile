import NetInfo from '@react-native-community/netinfo';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { pairWithUri } from '@/src/lib/walletconnect';

const PAIRING_TIMEOUT_MS = 15_000;

// Shared by the QR scan screen and the WalletConnect deep-link listener so both
// entry points into pairing show the same validation/timeout/error behavior.
export function useWalletConnectPairing() {
  const [isPairing, setIsPairing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        Alert.alert(
          'Connection failed',
          'Unable to reach the relay server. Check your internet connection and try again.',
        );
      }, PAIRING_TIMEOUT_MS);

      try {
        await pairWithUri(uri);
        // pairWithUri resolves once the request is sent; the session_proposal event
        // fires asynchronously in use-walletconnect.ts and navigates to /wc-session-proposal.
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
