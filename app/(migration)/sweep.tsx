import { buildAndSubmitSacTransfer } from '@/src/api/migration-tx';
import { useQueryClient } from '@tanstack/react-query';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import TokenIcon from '@/src/components/shared/TokenIcon';
import { HORIZON_URL, STELLAR_NETWORK_PASSPHRASE, STELLAR_RPC_URL } from '@/src/constants/config';
import { useTokenIcon } from '@/src/hooks/use-token-list';
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
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AssetStatus = 'idle' | 'pending' | 'done' | 'failed';

function AssetRow({
  asset,
  status,
  error,
  isRunning,
  isDark,
  theme,
  onMigrate,
}: {
  asset: MigrableAsset;
  status: AssetStatus;
  error?: string;
  isRunning: boolean;
  isDark: boolean;
  theme: Theme;
  onMigrate: () => void;
}) {
  const iconUrl = useTokenIcon(asset.code, asset.issuer);

  return (
    <Box
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
      <Box backgroundColor={isDark ? 'black' : 'text400'} borderRadius={22} mr="m">
        <TokenIcon iconUrl={iconUrl} size={44} />
      </Box>

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
        {error ? (
          <Text variant="p8" color="danger900" mt="xs" numberOfLines={2}>
            {error}
          </Text>
        ) : null}
      </Box>

      <Box alignItems="center" justifyContent="center">
        {status === 'idle' && !isRunning && (
          <TouchableOpacity onPress={onMigrate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Box
              backgroundColor="primary700"
              borderRadius={20}
              paddingVertical="xs"
              paddingHorizontal="s"
            >
              <Text variant="p8" color="black" fontWeight="700">
                Migrate
              </Text>
            </Box>
          </TouchableOpacity>
        )}
        {status === 'pending' && (
          <ActivityIndicator size="small" color={theme.colors.primary700} />
        )}
        {status === 'done' && (
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary700} />
        )}
        {status === 'failed' && !isRunning && (
          <TouchableOpacity onPress={onMigrate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh-circle" size={22} color={theme.colors.danger900} />
          </TouchableOpacity>
        )}
        {status === 'failed' && isRunning && (
          <Ionicons name="close-circle" size={22} color={theme.colors.danger900} />
        )}
      </Box>
    </Box>
  );
}

export default function MigrationSweep() {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { activeWallet, smartAccountAddress } = useWalletStore();
  const queryClient = useQueryClient();

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

    queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    queryClient.invalidateQueries({ queryKey: ['stellar-transactions'] });

    const anyFailed = assetsToRun.some((a) => !results[a.code]);
    if (!anyFailed) {
      router.replace('/(migration)/success');
    }
  };

  const handleMigrate = () => {
    if (!discovery) return;
    runMigration(discovery.assets.filter((a) => statuses[a.code] === 'idle'));
  };

  const handleMigrateOne = (asset: MigrableAsset) => {
    runMigration([asset]);
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
  const hasIdle = discovery.assets.some((a) => statuses[a.code] === 'idle');

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
        {discovery.assets.map((asset) => (
          <AssetRow
            key={asset.code}
            asset={asset}
            status={statuses[asset.code] ?? 'idle'}
            error={errors[asset.code]}
            isRunning={isRunning}
            isDark={isDark}
            theme={theme}
            onMigrate={() => handleMigrateOne(asset)}
          />
        ))}

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
        {hasIdle && !isRunning && (
          <TouchableOpacity activeOpacity={0.85} onPress={handleMigrate}>
            <Box
              backgroundColor="primary700"
              borderRadius={16}
              paddingVertical="m"
              alignItems="center"
            >
              <Text variant="h11" color="black" fontWeight="700">
                Migrate All
              </Text>
            </Box>
          </TouchableOpacity>
        )}

        {isRunning && (
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

        {hasFailures && !isRunning && !hasIdle && (
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
