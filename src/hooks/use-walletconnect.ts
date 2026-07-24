import { type WalletKitTypes } from '@reown/walletkit';
import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';

import { getActiveSessions, initWalletKit, walletKit } from '@/src/lib/walletconnect';
import { useWalletConnectStore } from '@/src/store/walletconnect';

// The Explore tab opens dApps in an in-app browser (SFSafariViewController /
// Custom Tab), which is a native view presented *above* the React Native root.
// A proposal/request route pushed while it's open renders underneath it and the
// user never sees the sheet, so the browser has to come down first. Rejects
// when no browser is open — that's the common case and is not an error.
function dismissInAppBrowser() {
  WebBrowser.dismissBrowser().catch(() => {});
}

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
        Sentry.captureException(err, {
          tags: { scope: 'walletconnect-init' },
          extra: { willRetryInMs: 5000 },
        });
        if (mounted) retryTimeout = setTimeout(init, 5000);
        return;
      }

      if (!mounted || !walletKit) return;

      storeRef.current.setActiveSessions(getActiveSessions());

      walletKit.on('session_proposal', (proposal: WalletKitTypes.SessionProposal) => {
        dismissInAppBrowser();
        storeRef.current.setPendingProposal(proposal);
        router.push('/wc-session-proposal');
      });

      walletKit.on('session_request', (request: WalletKitTypes.SessionRequest) => {
        dismissInAppBrowser();
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
