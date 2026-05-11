import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import TransactionItem from '@/src/components/shared/TransactionItem';
import { STELLAR_NETWORK_PASSPHRASE, STELLAR_RPC_URL } from '@/src/constants/config';
import { useDrawer } from '@/src/context/drawer-context';
import { useStellarTransactions } from '@/src/hooks/use-stellar-transactions';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Address, Asset, scValToNative, xdr } from '@stellar/stellar-sdk';
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

/**
 * Read the native XLM balance of a Soroban smart account (C-address) directly
 * from the Stellar Asset Contract (SAC) ledger entries via Soroban RPC.
 *
 * Horizon's /accounts/{id} only works for classic G-addresses. For C-addresses
 * the balance lives in the native SAC's contract storage under the key:
 *   ContractData { contract: nativeSac, key: Vec([Symbol("Balance"), Address(cAddress)]) }
 *
 * The stored ScVal is a map { amount: i128 (stroops), authorized: bool, clawback: bool }.
 * Uses XMLHttpRequest to avoid the Axios Android TLS failure on Soroban JSON-RPC calls.
 */
function fetchNativeSacBalance(cAddress: string): Promise<string> {
  const nativeSacId = Asset.native().contractId(STELLAR_NETWORK_PASSPHRASE);

  const balanceKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(nativeSacId).toScAddress(),
      key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Balance'), new Address(cAddress).toScVal()]),
      durability: xdr.ContractDataDurability.persistent(),
    }),
  );

  // btoa byte-loop — avoids Buffer polyfill issues in React Native
  const bytes = new Uint8Array(balanceKey.toXDR());
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const keyB64 = btoa(binary);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', STELLAR_RPC_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 15000;
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        const entries: any[] = json.result?.entries ?? [];
        if (entries.length === 0) {
          resolve('0');
          return;
        }
        const entryData = xdr.LedgerEntryData.fromXDR(entries[0].xdr, 'base64');
        const val = entryData.contractData().val();
        const parsed = scValToNative(val) as { amount: bigint };
        resolve((Number(parsed.amount) / 10_000_000).toFixed(7));
      } catch {
        resolve('0');
      }
    };
    xhr.onerror = () => resolve('0');
    xhr.ontimeout = () => resolve('0');
    xhr.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getLedgerEntries',
        params: { keys: [keyB64] },
      }),
    );
  });
}

function RaysBackgroundInner() {
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
}
const RaysBackground = memo(RaysBackgroundInner);
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

  const { smartAccountAddress, accounts, activeAccountIndex } = useWalletStore();
  const [showBalance, setShowBalance] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);

  const activeAccount = accounts[activeAccountIndex];
  const activeAccountName = activeAccount?.name ?? 'Account 1';

  const { openDrawer } = useDrawer();

  const {
    data: xlmBalance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
    isRefetching: isRefetchingBalance,
  } = useQuery({
    queryKey: ['stellar-balance', smartAccountAddress],
    queryFn: () => fetchNativeSacBalance(smartAccountAddress!),
    enabled: !!smartAccountAddress,
    staleTime: 30_000,
  });

  const {
    data: transactions,
    isLoading: txLoading,
    refetch: refetchTx,
    isRefetching: isRefetchingTx,
  } = useStellarTransactions(smartAccountAddress);

  // Soroban contract accounts don't have classic Stellar subentries or sponsorship,
  // so the full balance is spendable (no minimum reserve deduction).
  const spendableXlm = Number(xlmBalance ?? '0');

  const handleRefresh = () => {
    refetchBalance();
    refetchTx();
  };

  const recentTx = transactions?.slice(0, 5) ?? [];
  const XLM_PRICE = 0.16; // TODO: Fetch real-time price from API
  const usdBalance = spendableXlm * XLM_PRICE;

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
