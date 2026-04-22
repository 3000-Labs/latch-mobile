import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { restoreStellarWallet } from '@/src/lib/seed-wallet';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Horizon } from '@stellar/stellar-sdk';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const MNEMONIC_KEY = 'latch_mnemonic';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-6)}`;

const formatXLM = (raw: string) =>
  parseFloat(raw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Home = () => {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();

  const [gAddress, setGAddress] = useState<string | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(MNEMONIC_KEY).then((mnemonic) => {
      if (!mnemonic) return;
      const wallet = restoreStellarWallet(mnemonic);
      console.log(wallet);
      setGAddress(wallet.gAddress);
    });
  }, []);

  const {
    data: account,
    isLoading: balanceLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['stellar-account', gAddress],
    queryFn: async () => {
      const server = new Horizon.Server(HORIZON_URL);
      return server.accounts().accountId(gAddress!).call();
    },
    enabled: !!gAddress,
    retry: 1,
    staleTime: 30_000,
  });

  const xlmBalance = account?.balances?.find((b) => b.asset_type === 'native')?.balance ?? null;

  const handleCopyAddress = async () => {
    if (!gAddress) return;
    await Clipboard.setStringAsync(gAddress);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const cardBg = theme.colors.primary700;
  const surfaceBg = statusBarStyle !== 'light' ? theme.colors.text50 : theme.colors.gray900;

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style={statusBarStyle} />
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary700}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.m,
          paddingBottom: 120,
          paddingTop: 60,
        }}
      >
        {/* Header */}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="xl">
          <Image
            source={require('@/src/assets/images/logosym.png')}
            style={{ width: 35, height: 35 }}
            resizeMode="contain"
          />
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </Box>

        {/* Balance Card */}
        <Box borderRadius={24} padding="xl" mb="l" style={{ backgroundColor: cardBg }}>
          <Text variant="body" style={{ color: 'rgba(0,0,0,0.6)', marginBottom: 4 }}>
            Total Balance
          </Text>

          {balanceLoading || !gAddress ? (
            <ActivityIndicator
              color="black"
              size="small"
              style={{ alignSelf: 'flex-start', marginVertical: 8 }}
            />
          ) : isError || xlmBalance === null ? (
            <Box>
              <Text variant="h7" style={{ color: '#000' }}>
                0.00 XLM
              </Text>
              <Text variant="caption" style={{ color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>
                Account not yet funded
              </Text>
            </Box>
          ) : (
            <Text variant="h6" style={{ color: '#000', fontWeight: '800' }}>
              {formatXLM(xlmBalance)} XLM
            </Text>
          )}

          {/* Address pill */}
          {gAddress && (
            <TouchableOpacity
              onPress={handleCopyAddress}
              activeOpacity={0.7}
              style={{ marginTop: 20 }}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                gap="xs"
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(0,0,0,0.18)',
                  borderRadius: 100,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
                  {truncateAddress(gAddress)}
                </Text>
                <Ionicons
                  name={addressCopied ? 'checkmark' : 'copy-outline'}
                  size={13}
                  color="#fff"
                />
              </Box>
            </TouchableOpacity>
          )}
        </Box>

        {/* Action Buttons */}
        <Box flexDirection="row" gap="m" mb="xl">
          {(['Send', 'Receive', 'Swap'] as const).map((label) => {
            const icon =
              label === 'Send'
                ? 'arrow-up'
                : label === 'Receive'
                  ? 'arrow-down'
                  : 'swap-horizontal';
            return (
              <TouchableOpacity key={label} style={{ flex: 1 }} activeOpacity={0.75}>
                <Box
                  borderRadius={16}
                  padding="m"
                  alignItems="center"
                  gap="xs"
                  style={{ backgroundColor: surfaceBg }}
                >
                  <Ionicons name={icon} size={22} color={theme.colors.primary700} />
                  <Text variant="caption" color="textPrimary" fontWeight="600">
                    {label}
                  </Text>
                </Box>
              </TouchableOpacity>
            );
          })}
        </Box>

        {/* Recent Transactions */}
        <Box mb="m">
          <Text variant="h10" color="textPrimary" mb="m">
            Recent Transactions
          </Text>
          <Box
            borderRadius={16}
            padding="xl"
            alignItems="center"
            gap="m"
            style={{ backgroundColor: surfaceBg }}
          >
            <Ionicons name="receipt-outline" size={36} color={theme.colors.gray600} />
            <Text variant="body" color="textSecondary" textAlign="center">
              No transactions yet
            </Text>
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
};

export default Home;
