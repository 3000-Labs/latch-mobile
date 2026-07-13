import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { discoverMigration } from '@/src/lib/migration';
import { useWalletStore, type WalletAccount } from '@/src/store/wallet';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

/**
 * Migration entry point — runs discovery and routes accordingly.
 *
 * Both entry paths land here:
 *   A) Post-deploy: deploy-account.tsx → router.replace('/(migration)')
 *   B) Home banner: user taps banner → router.push('/(migration)')
 *
 * After discovery:
 *   not_started → sweep screen
 *   complete / not_needed → back to home (migration already done or not applicable)
 */
export default function MigrationIndex() {
  const { isDark } = useAppTheme();
  const { activeWallet, smartAccountAddress, accounts, activeAccountIndex } = useWalletStore();

  useEffect(() => {
    const discover = async () => {
      // Build an account object from the available store state.
      // During post-deploy, accounts[] may still be empty but activeWallet is set.
      const account = accounts[activeAccountIndex] ?? (activeWallet && smartAccountAddress
        ? {
            index: 0,
            name: '',
            gAddress: activeWallet.gAddress,
            publicKeyHex: activeWallet.publicKeyHex,
            smartAccountAddress,
          }
        : null);

      if (!account) {
        router.replace('/(tabs)');
        return;
      }

      const discovery = await discoverMigration(account as WalletAccount);

      if (discovery.state === 'not_started') {
        router.replace('/(migration)/sweep');
      } else {
        router.replace('/(tabs)');
      }
    };

    discover();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box flex={1} backgroundColor="mainBackground" justifyContent="center" alignItems="center">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ActivityIndicator size="large" color="#FFAD00" />
      <Text variant="p7" color="textSecondary" mt="m">
        Checking your accounts…
      </Text>
    </Box>
  );
}
