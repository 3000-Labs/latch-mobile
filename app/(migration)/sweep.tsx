import { buildAndSubmitSacTransfer } from '@/src/api/migration-tx';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { HORIZON_URL, STELLAR_NETWORK_PASSPHRASE, STELLAR_RPC_URL } from '@/src/constants/config';
import {
  discoverMigration,
  type MigrableAsset,
  type MigrationDiscovery,
} from '@/src/lib/migration';
import { useWalletStore, type WalletAccount } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AssetStatus = 'idle' | 'pending' | 'done' | 'failed';

const TOKEN_ICONS: Record<string, ReturnType<typeof require>> = {
  ETH: require('@/src/assets/token/eth.png'),
  USDT: require('@/src/assets/token/usdt.png'),
};
const DEFAULT_TOKEN_ICON = require('@/src/assets/token/stellar.png');
const getTokenIcon = (code: string) => TOKEN_ICONS[code?.toUpperCase()] ?? DEFAULT_TOKEN_ICON;

export default function MigrationSweep() {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { activeWallet, smartAccountAddress } = useWalletStore();

  const [discovery, setDiscovery] = useState<MigrationDiscovery | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AssetStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isMounted = useRef(true);
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  // Discover assets on mount
  useEffect(() => {
    const run = async () => {
      const account =
        activeWallet && smartAccountAddress
          ? {
              index: 0,
              name: '',
              gAddress: activeWallet.gAddress,
              publicKeyHex: activeWallet.publicKeyHex,
              smartAccountAddress,
            }
          : null;

      if (!account) {
        router.replace('/(tabs)');
        return;
      }

      const result = await discoverMigration(account as WalletAccount);
      if (!isMounted.current) return;

      if (result.state !== 'not_started') {
        router.replace('/(tabs)');
        return;
      }

      const initialStatuses: Record<string, AssetStatus> = {};
      result.assets.forEach((a) => {
        initialStatuses[a.code] = 'idle';
      });
      setDiscovery(result);
      setStatuses(initialStatuses);
      setIsLoading(false);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = (code: string, status: AssetStatus) => {
    if (isMounted.current) setStatuses((s) => ({ ...s, [code]: status }));
  };
  const setError = (code: string, error: string) => {
    if (isMounted.current) setErrors((e) => ({ ...e, [code]: error }));
  };

  const runMigration = async (assetsToRun: MigrableAsset[]) => {
    if (!activeWallet || !discovery) return;
    setIsRunning(true);

    const results: Record<string, boolean> = {};

    for (const asset of assetsToRun) {
      setStatus(asset.code, 'pending');
      setError(asset.code, '');

      const result = await buildAndSubmitSacTransfer({
        sacContractId: asset.sacContractId,
        fromGAddress: discovery.gAddress,
        toCAddress: discovery.cAddress,
        amountHuman: asset.amount,
        decimals: 7,
        keypair: activeWallet.keypair,
        rpcUrl: STELLAR_RPC_URL,
        networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
        horizonUrl: HORIZON_URL,
      });

      if (!isMounted.current) return;
      results[asset.code] = result.success;
      setStatus(asset.code, result.success ? 'done' : 'failed');
      if (!result.success && result.error) setError(asset.code, result.error);
    }

    if (!isMounted.current) return;
    setIsRunning(false);

    // If all assets in this run succeeded, check on-chain and navigate to success
    const anyFailed = assetsToRun.some((a) => !results[a.code]);
    if (!anyFailed) {
      router.replace('/(migration)/success');
    }
  };

  const handleMigrate = () => {
    if (!discovery) return;
    runMigration(discovery.assets);
  };

  const handleRetryFailed = () => {
    if (!discovery) return;
    const failed = discovery.assets.filter((a) => statuses[a.code] === 'failed');
    runMigration(failed);
  };

  if (isLoading) {
    return (
      <Box flex={1} backgroundColor="mainBackground" justifyContent="center" alignItems="center">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={theme.colors.primary700} />
        <Text variant="p7" color="textSecondary" mt="m">
          Loading assets…
        </Text>
      </Box>
    );
  }

  if (!discovery) return null;

  const hasFailures = Object.values(statuses).some((s) => s === 'failed');
  const noneStarted = discovery.assets.every((a) => statuses[a.code] === 'idle');

  return (
    <Box flex={1} backgroundColor="mainBackground" style={{ paddingTop: insets.top }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <Box flexDirection="row" alignItems="center" paddingHorizontal="m" height={56}>
        {!isRunning && (
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Box flex={1} alignItems="center">
          <Text variant="h10" color="textPrimary" fontWeight="700">
            Migrate Assets
          </Text>
        </Box>
        <Box width={24} />
      </Box>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <Box
          backgroundColor={isDark ? 'gray900' : 'gray100'}
          borderRadius={16}
          padding="m"
          mb="l"
          style={!isDark ? { borderWidth: 1, borderColor: '#F0F0F0' } : {}}
        >
          <Text variant="p7" color="textSecondary" lineHeight={20}>
            These assets are on your classic Stellar account. Migrate them to your smart account to
            manage everything from one place.
          </Text>
        </Box>

        {/* Asset rows */}
        {discovery.assets.map((asset) => {
          const status = statuses[asset.code] ?? 'idle';
          const err = errors[asset.code];
          console.log({ err });

          return (
            <Box
              key={asset.code}
              flexDirection="row"
              alignItems="center"
              backgroundColor={isDark ? 'gray900' : 'white'}
              padding="m"
              borderRadius={16}
              mb="s"
              style={
                !isDark
                  ? {
                      borderWidth: 1,
                      borderColor: '#F5F5F5',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 4,
                      elevation: 2,
                    }
                  : {}
              }
            >
              {/* Token icon */}
              <Box
                width={44}
                height={44}
                borderRadius={22}
                backgroundColor={isDark ? 'black' : 'text400'}
                justifyContent="center"
                alignItems="center"
                mr="m"
              >
                <Image
                  source={getTokenIcon(asset.code)}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </Box>

              {/* Code + amount */}
              <Box flex={1}>
                <Text variant="h11" color="textPrimary" fontWeight="700">
                  {asset.code}
                </Text>
                <Text variant="p8" color="textSecondary" mt="xs">
                  {parseFloat(asset.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 7,
                  })}{' '}
                  {asset.code}
                </Text>
                {err ? (
                  <Text variant="p8" color="danger900" mt="xs" numberOfLines={2}>
                    {err}
                  </Text>
                ) : null}
              </Box>

              {/* Status indicator */}
              <Box width={28} alignItems="center">
                {status === 'pending' && (
                  <ActivityIndicator size="small" color={theme.colors.primary700} />
                )}
                {status === 'done' && (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary700} />
                )}
                {status === 'failed' && (
                  <Ionicons name="close-circle" size={22} color={theme.colors.danger900} />
                )}
              </Box>
            </Box>
          );
        })}

        {/* Base reserve notice */}
        <Box flexDirection="row" alignItems="center" mt="s" mb="xl" gap="xs">
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text variant="p8" color="textSecondary">
            1 XLM will remain in your classic account as base reserve.
          </Text>
        </Box>
      </ScrollView>

      {/* Footer CTA */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        paddingHorizontal="m"
        style={{
          paddingBottom: insets.bottom + 16,
          paddingTop: 16,
          backgroundColor: isDark ? theme.colors.mainBackground : theme.colors.mainBackground,
        }}
      >
        {noneStarted && (
          <TouchableOpacity activeOpacity={0.85} onPress={handleMigrate} disabled={isRunning}>
            <Box
              backgroundColor="primary700"
              borderRadius={16}
              paddingVertical="m"
              alignItems="center"
            >
              <Text variant="h11" color="black" fontWeight="700">
                Migrate Assets
              </Text>
            </Box>
          </TouchableOpacity>
        )}

        {isRunning && !noneStarted && (
          <Box
            backgroundColor={isDark ? 'gray900' : 'gray100'}
            borderRadius={16}
            paddingVertical="m"
            alignItems="center"
          >
            <Text variant="h11" color="textSecondary" fontWeight="700">
              Migrating…
            </Text>
          </Box>
        )}

        {hasFailures && !isRunning && (
          <TouchableOpacity activeOpacity={0.85} onPress={handleRetryFailed}>
            <Box
              backgroundColor="primary700"
              borderRadius={16}
              paddingVertical="m"
              alignItems="center"
            >
              <Text variant="h11" color="black" fontWeight="700">
                Retry Failed
              </Text>
            </Box>
          </TouchableOpacity>
        )}
      </Box>
    </Box>
  );
}
