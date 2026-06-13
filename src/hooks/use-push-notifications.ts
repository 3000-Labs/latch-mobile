/**
 * use-push-notifications.ts — mounts push for the authenticated shell:
 * registers this device's token for its shared-wallet queues, and routes
 * notification taps to the pending-approvals screen.
 *
 * The push payload is content-free ({data: {queueIndex}} only), so the rich
 * detail always comes from the local decrypt-and-poll path — the notification
 * is purely a "go look" signal.
 */

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { discoverSharedWallets } from '@/src/lib/membership';
import { registerPushToken } from '@/src/lib/push-registration';
import { useWalletStore } from '@/src/store/wallet';

// Foreground presentation: show the banner (it's content-free), no sound/badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(): void {
  const accounts = useWalletStore((s) => s.accounts);
  // Re-register when the set of shared wallets changes (e.g. a wallet was
  // added or created). Keyed on addresses, not array identity, so rehydrates
  // don't re-trigger. Also re-runs WCK pickup lag away: a wallet whose key
  // arrived after mount gets registered on the next set change / app start.
  const multisigKey = accounts
    .filter((a) => a.isMultisig && a.smartAccountAddress)
    .map((a) => a.smartAccountAddress)
    .join(',');

  // Discover shared wallets this device was added to (on a second signer's
  // device). Newly added wallets change `multisigKey`, so the effect below then
  // registers their push queues. Runs once on mount; non-fatal.
  useEffect(() => {
    discoverSharedWallets().catch((err) => {
      if (__DEV__) console.log('[membership] discovery failed:', err?.message);
    });
  }, []);

  useEffect(() => {
    registerPushToken().catch((err) => {
      if (__DEV__) console.log('[push-registration] failed:', err?.message);
    });
  }, [multisigKey]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const queueIndex = response.notification.request.content.data?.queueIndex;
      // Content-free payload: the queueIndex is only a hint that something is
      // pending — the screen lists and decrypts locally.
      if (typeof queueIndex === 'string' && queueIndex) {
        router.push('/pending-approval');
      }
    });
    return () => sub.remove();
  }, []);
}
