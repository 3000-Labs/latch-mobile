import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import TransactionItem from '@/src/components/shared/TransactionItem';
import { useDrawer } from '@/src/context/drawer-context';
import { useStellarTransactions } from '@/src/hooks/use-stellar-transactions';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Horizon } from '@stellar/stellar-sdk';
import { useQuery } from '@tanstack/react-query';
import { ImageBackground } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
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
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

const RaysBackground = () => {
  return (
    <Box position="absolute" style={{ top: 0, left: '28%' }}>
      <ImageBackground
        source={require('@/src/assets/icon/Circle.png')}
        style={{
          position: 'absolute',
          width: 182,
          height: 182,
        }}
      />
    </Box>
  );
};
const banners = [
  {
    id: 1,
    image: require('@/src/assets/icon/Container.png'),
  },
  {
    id: 2,
    image: require('@/src/assets/icon/Container.png'),
  },
  {
    id: 3,
    image: require('@/src/assets/icon/Container.png'),
  },
];
const Home = () => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const statusBarStyle = useStatusBarStyle();
  const insets = useSafeAreaInsets();

  const { smartAccountAddress, rehydrateWallet } = useWalletStore();
  const [showBalance, setShowBalance] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    rehydrateWallet();
  }, [rehydrateWallet]);

  const {
    data: account,
    isLoading: balanceLoading,
    refetch: refetchBalance,
    isRefetching: isRefetchingBalance,
  } = useQuery({
    queryKey: ['stellar-account', smartAccountAddress],
    queryFn: async () => {
      const server = new Horizon.Server(HORIZON_URL);
      return server.accounts().accountId(smartAccountAddress!).call();
    },
    enabled: !!smartAccountAddress,
    staleTime: 30_000,
  });

  const {
    data: transactions,
    isLoading: txLoading,
    refetch: refetchTx,
    isRefetching: isRefetchingTx,
  } = useStellarTransactions(smartAccountAddress);

  const xlmBalance = account?.balances?.find((b) => b.asset_type === 'native')?.balance ?? '0.00';

  const handleRefresh = () => {
    refetchBalance();
    refetchTx();
  };

  const recentTx = transactions?.slice(0, 5) ?? [];
  const XLM_PRICE = 0.16; // TODO: Fetch real-time price from API
  const usdBalance = Number(xlmBalance) * XLM_PRICE;

  const { openDrawer } = useDrawer();

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
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }}
              style={{ width: 32, height: 32, borderRadius: 16 }}
            />
            <Text variant="h11" color="textPrimary" fontWeight="700">
              Crownz
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
          <TouchableOpacity>
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
            refreshing={isRefetchingBalance || isRefetchingTx}
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
              ? balanceLoading
                ? '...'
                : `$${Number(usdBalance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
              : '••••••••'}
          </Text>

          <Box flexDirection="row" alignItems="center" gap="s" mt="xs">
            <Text variant="p7" color="textSecondary" fontWeight="600">
              {Number(xlmBalance).toLocaleString()} XLM
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
                    style={{
                      height: '100%',
                      width: '100%',
                    }}
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

        {/* Recent Activity */}
        <Box paddingHorizontal="m">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="h9" color="textPrimary" fontWeight="700">
              Recent Activity
            </Text>
            <TouchableOpacity>
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
