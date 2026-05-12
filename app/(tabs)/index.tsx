import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import TransactionItem from '@/src/components/shared/TransactionItem';
import { useDrawer } from '@/src/context/drawer-context';
import { useStellarTransactions } from '@/src/hooks/use-stellar-transactions';
import { usePortfolio, type TokenBalance } from '@/src/hooks/use-portfolio';
import { useTrackedTokens } from '@/src/hooks/use-tracked-tokens';
import { discoverMigration } from '@/src/lib/migration';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useQuery } from '@tanstack/react-query';
import { ImageBackground } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOKEN_ICONS: Record<string, ReturnType<typeof require>> = {
  ETH: require('@/src/assets/token/eth.png'),
  USDT: require('@/src/assets/token/usdt.png'),
  USDC: require('@/src/assets/token/usdt.png'), // reuse USDT icon until USDC asset is added
};
const DEFAULT_TOKEN_ICON = require('@/src/assets/token/stellar.png');
const getTokenIcon = (code: string) => TOKEN_ICONS[code?.toUpperCase()] ?? DEFAULT_TOKEN_ICON;

function RaysBackgroundInner() {
  return (
    <Box position="absolute" style={{ top: 0, left: '28%' }}>
      <ImageBackground
        source={require('@/src/assets/icon/Circle.png')}
        style={{ position: 'absolute', width: 182, height: 182 }}
      />
    </Box>
  );
}
const RaysBackground = memo(RaysBackgroundInner);

const banners = [
  { id: 1, image: require('@/src/assets/icon/Container.png') },
  { id: 2, image: require('@/src/assets/icon/Container.png') },
  { id: 3, image: require('@/src/assets/icon/Container.png') },
];

function TokenRow({ token, showBalance, isDark, theme }: {
  token: TokenBalance;
  showBalance: boolean;
  isDark: boolean;
  theme: Theme;
}) {
  const amount = parseFloat(token.amount);
  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: token.code === 'XLM' ? 7 : 2,
  });
  const formattedUsd = token.usdValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor={isDark ? 'gray900' : 'white'}
      padding="m"
      borderRadius={20}
      mb="s"
      style={
        !isDark
          ? {
              borderWidth: 1,
              borderColor: '#F5F5F5',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }
          : {}
      }
    >
      <Box
        width={48}
        height={48}
        borderRadius={24}
        backgroundColor={isDark ? 'black' : 'text400'}
        justifyContent="center"
        alignItems="center"
        mr="m"
      >
        <Image
          source={getTokenIcon(token.code)}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </Box>
      <Box flex={1}>
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {token.code}
        </Text>
        <Text variant="p8" color="textSecondary" mt="xs">
          {token.code === 'XLM' ? 'Stellar Lumens' : token.code}
        </Text>
      </Box>
      <Box alignItems="flex-end">
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {showBalance ? `${formattedAmount} ${token.code}` : '••••'}
        </Text>
        <Text variant="p8" color="textSecondary" mt="xs">
          {showBalance ? `$${formattedUsd}` : '••••'}
        </Text>
      </Box>
    </Box>
  );
}

const Home = () => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const statusBarStyle = useStatusBarStyle();
  const insets = useSafeAreaInsets();

  const { smartAccountAddress, accounts, activeAccountIndex, mnemonic } = useWalletStore();
  const [showBalance, setShowBalance] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);

  const activeAccount = accounts[activeAccountIndex];
  const activeAccountName = activeAccount?.name ?? 'Account 1';

  const { openDrawer } = useDrawer();

  const { tokens: trackedTokens } = useTrackedTokens();

  const {
    data: portfolio,
    isLoading: portfolioLoading,
    refetch: refetchPortfolio,
    isRefetching: isRefetchingPortfolio,
  } = usePortfolio(smartAccountAddress, activeAccount?.gAddress, trackedTokens);

  const {
    data: transactions,
    refetch: refetchTx,
    isRefetching: isRefetchingTx,
  } = useStellarTransactions(smartAccountAddress);

  const { data: migrationState } = useQuery({
    queryKey: ['migration-state', smartAccountAddress, activeAccount?.gAddress],
    queryFn: () => discoverMigration(activeAccount!),
    enabled: !!activeAccount?.gAddress && !!smartAccountAddress && !!mnemonic,
    staleTime: 60_000,
  });

  const handleRefresh = () => {
    refetchPortfolio();
    refetchTx();
  };

  const totalUsd = (portfolio ?? []).reduce((sum, t) => sum + t.usdValue, 0);
  const xlmToken = portfolio?.find((t) => t.code === 'XLM');
  const spendableXlm = parseFloat(xlmToken?.amount ?? '0');
  const recentTx = transactions?.slice(0, 5) ?? [];

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style={statusBarStyle} />

      {/* Header */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="m"
        style={{ paddingTop: insets.top + 8 }}
        mb="m"
      >
        <TouchableOpacity activeOpacity={0.7} onPress={openDrawer}>
          <Box
            flexDirection="row"
            alignItems="center"
            backgroundColor={isDark ? 'gray900' : 'gray100'}
            borderRadius={100}
            paddingVertical="xs"
            paddingHorizontal="s"
            gap="s"
            style={!isDark ? { borderWidth: 1, borderColor: '#F0F0F0' } : {}}
          >
            <Box
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="primary700"
              justifyContent="center"
              alignItems="center"
            >
              <Text variant="p7" color="textWhite" fontWeight="700">
                {activeAccountName.charAt(0)}
              </Text>
            </Box>
            <Text variant="h11" color="textPrimary" fontWeight="700">
              {activeAccountName}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.textPrimary} />
          </Box>
        </TouchableOpacity>

        <Box flexDirection="row" gap="m">
          <TouchableOpacity>
            <Ionicons
              name="search-outline"
              size={24}
              color={isDark ? theme.colors.bgDark700 : theme.colors.bgDark100}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/qrcode-scan')}>
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={24}
              color={isDark ? theme.colors.bgDark700 : theme.colors.bgDark100}
            />
          </TouchableOpacity>
        </Box>
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingPortfolio || isRefetchingTx}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary700}
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Balance Section */}
        <Box alignItems="center" pb="xl" position="relative" mt="s">
          {!isDark && <RaysBackground />}
          <TouchableOpacity
            onPress={() => setShowBalance(!showBalance)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}
          >
            <Text variant="p7" color="textSecondary" fontWeight="600">
              Total Balance
            </Text>
            <Ionicons
              name={showBalance ? 'eye-outline' : 'eye-off-outline'}
              size={14}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <Text variant="h5" color="textPrimary" style={{ fontWeight: '700', letterSpacing: -1 }}>
            {showBalance
              ? portfolioLoading
                ? '...'
                : `$${totalUsd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
              : '•••'}
          </Text>

          <Box flexDirection="row" alignItems="center" gap="s" mt="xs">
            <Text variant="p7" color="textSecondary" fontWeight="600">
              {showBalance
                ? `${spendableXlm.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 7,
                  })} XLM`
                : '••••'}
            </Text>
            <Box
              backgroundColor={isDark ? 'gray900' : 'gray100'}
              borderRadius={6}
              paddingHorizontal="s"
              paddingVertical="xs"
              style={!isDark ? { borderWidth: 1, borderColor: '#F0F0F0' } : {}}
            >
              <Text variant="p7" color="textPrimary" fontWeight="700">
                0.00%
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box flexDirection="row" justifyContent="space-around" paddingHorizontal="m" mb="xl" mt="m">
          {[
            { label: 'Add', icon: require('@/src/assets/icon/plus-big.png') },
            { label: 'Send', icon: require('@/src/assets/icon/ArrowUp.png'), route: '/send-token' },
            {
              label: 'Receive',
              icon: require('@/src/assets/icon/arrowDown.png'),
              route: '/receive-token',
            },
            {
              label: 'Swap',
              icon: require('@/src/assets/icon/RepeatGold.png'),
            },
          ].map((item, index) => (
            <Box key={index} alignItems="center" gap="s">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if ('route' in item && item.route) {
                    router.push(item.route as any);
                  }
                }}
              >
                <Box
                  width={68}
                  height={68}
                  borderRadius={34}
                  backgroundColor={isDark ? 'gray900' : 'gray100'}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Image
                    source={item.icon}
                    style={{ width: 28, height: 28 }}
                    resizeMode="contain"
                    tintColor={
                      index === 3 ? undefined : isDark ? theme.colors.primary700 : '#FFAD00'
                    }
                  />
                </Box>
              </TouchableOpacity>
              <Text variant="p7" color="bgDark600">
                {item.label}
              </Text>
            </Box>
          ))}
        </Box>

        {/* Your Assets */}
        {(portfolio ?? []).length > 0 && (
          <Box paddingHorizontal="m" mb="xl">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
              <Text variant="h9" color="textPrimary" fontWeight="700">
                Your Assets
              </Text>
              <TouchableOpacity onPress={() => router.push('/add-token')}>
                <Text variant="p7" color="primary700" fontWeight="700">
                  Manage
                </Text>
              </TouchableOpacity>
            </Box>
            {(portfolio ?? []).map((token) => (
              <TokenRow
                key={token.code + (token.issuer ?? '')}
                token={token}
                showBalance={showBalance}
                isDark={isDark}
                theme={theme}
              />
            ))}
          </Box>
        )}

        {/* Banner Carousel */}
        <Box mb="xl">
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={banners}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const index = Math.round(x / SCREEN_WIDTH);
              setBannerIndex(index);
            }}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Box width={SCREEN_WIDTH} alignItems="center" justifyContent="center">
                <Box width={SCREEN_WIDTH - 32} height={101} overflow={'hidden'} borderRadius={12}>
                  <Image
                    source={item.image}
                    style={{ height: '100%', width: '100%' }}
                    resizeMode="cover"
                  />
                </Box>
              </Box>
            )}
          />
          <Box flexDirection="row" justifyContent="center" mt="m" gap="xs">
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                width={bannerIndex === i ? 20 : 6}
                height={6}
                borderRadius={3}
                backgroundColor={bannerIndex === i ? 'primary700' : isDark ? 'gray800' : 'gray200'}
              />
            ))}
          </Box>
        </Box>

        {/* Migration banner */}
        {migrationState?.state === 'not_started' && (
          <Box paddingHorizontal="m" mb="m">
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(migration)')}>
              <Box
                borderRadius={16}
                padding="m"
                flexDirection="row"
                alignItems="center"
                gap="m"
                style={{
                  backgroundColor: isDark ? '#2C2000' : '#FFFBEB',
                  borderWidth: 1,
                  borderColor: isDark ? '#4A3800' : '#FFE58F',
                }}
              >
                <Box
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor="primary700"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Ionicons name="swap-horizontal" size={20} color="#000" />
                </Box>
                <Box flex={1}>
                  <Text
                    variant="h11"
                    fontWeight="700"
                    style={{ color: isDark ? '#FFD666' : '#874D00' }}
                  >
                    Assets on classic account
                  </Text>
                  <Text variant="p8" style={{ color: isDark ? '#B8860B' : '#AD6800' }} mt="xs">
                    Tap to migrate them to your smart account
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={16} color={isDark ? '#B8860B' : '#AD6800'} />
              </Box>
            </TouchableOpacity>
          </Box>
        )}

        {/* Recent Activity */}
        <Box paddingHorizontal="m">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="h9" color="textPrimary" fontWeight="700">
              Recent Activity
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text variant="p7" color="primary700" fontWeight="700">
                View All
              </Text>
            </TouchableOpacity>
          </Box>

          {recentTx.length === 0 ? (
            <Box
              py="xl"
              alignItems="center"
              backgroundColor={isDark ? 'gray900' : 'gray100'}
              borderRadius={16}
            >
              <Text color="textSecondary" variant="p7">
                No transactions found
              </Text>
            </Box>
          ) : (
            recentTx.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} walletAddress={smartAccountAddress} />
            ))
          )}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default Home;
