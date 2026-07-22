import { type WalletKitTypes } from '@reown/walletkit';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { getActiveSessions, initWalletKit, walletKit } from '@/src/lib/walletconnect';
import { useWalletConnectStore } from '@/src/store/walletconnect';

export function useWalletConnect() {
  const storeRef = useRef(useWalletConnectStore.getState());

  useEffect(() => {
    const unsub = useWalletConnectStore.subscribe((s) => {
      storeRef.current = s;
    });
    return unsub;
  }, []);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;

    const init = async () => {
      try {
        await initWalletKit();
      } catch (err) {
        console.error('[WalletConnect] init failed, retrying in 5s', err);
        if (mounted) retryTimeout = setTimeout(init, 5000);
        return;
      }

      if (!mounted || !walletKit) return;

      storeRef.current.setActiveSessions(getActiveSessions());

      walletKit.on('session_proposal', (proposal: WalletKitTypes.SessionProposal) => {
        storeRef.current.setPendingProposal(proposal);
        router.push('/wc-session-proposal');
      });

      walletKit.on('session_request', (request: WalletKitTypes.SessionRequest) => {
        storeRef.current.setPendingRequest(request);
        router.push('/wc-session-request');
      });

      walletKit.on('session_delete', () => {
        storeRef.current.setActiveSessions(getActiveSessions());
      });
    };

    init();
    return () => {
      mounted = false;
      clearTimeout(retryTimeout);
    };
  }, []);
}
