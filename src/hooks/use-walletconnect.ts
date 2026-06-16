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

    const init = async () => {
      await initWalletKit();
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

    init().catch(console.error);
    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
