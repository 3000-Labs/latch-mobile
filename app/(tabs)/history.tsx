import SearchHeader from '@/src/components/history/SearchHeader';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { StellarPayment, useStellarTransactions } from '@/src/hooks/use-stellar-transactions';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  SectionList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const height = Dimensions.get('window').height;
const TOKEN_ICONS: Record<string, ReturnType<typeof require>> = {
  ETH: require('@/src/assets/token/eth.png'),
  USDT: require('@/src/assets/token/usdt.png'),
};
const DEFAULT_TOKEN_ICON = require('@/src/assets/token/stellar.png');
const getTokenIcon = (code?: string) =>
  TOKEN_ICONS[code?.toUpperCase() ?? ''] ?? DEFAULT_TOKEN_ICON;

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dateSectionLabel(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupByDate(txs: StellarPayment[]): { title: string; data: StellarPayment[] }[] {
  const map = new Map<string, StellarPayment[]>();
  for (const tx of txs) {
    const label = dateSectionLabel(tx.createdAt);
    const group = map.get(label) ?? [];
    group.push(tx);
    map.set(label, group);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

const History = () => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

  const { smartAccountAddress } = useWalletStore();

  const {
    data: transactions,
    isLoading,
    isFetching,
    refetch,
  } = useStellarTransactions(smartAccountAddress);

  const filtered = useMemo(() => {
    const all = transactions ?? [];

    let result = all;

    if (activeFilter === 'Sent') {
      result = result.filter(
        (tx) => tx.type !== 'invoke_host_function' && tx.from === smartAccountAddress,
      );
    } else if (activeFilter === 'Received') {
      result = result.filter(
        (tx) => tx.type !== 'invoke_host_function' && tx.to === smartAccountAddress,
      );
    } else if (activeFilter === 'Contract') {
      result = result.filter((tx) => tx.type === 'invoke_host_function');
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (tx) =>
          (tx.assetCode ?? 'XLM').toLowerCase().includes(q) ||
          tx.from.toLowerCase().includes(q) ||
          tx.to.toLowerCase().includes(q),
      );
    }

    return result;
  }, [transactions, activeFilter, search, smartAccountAddress]);

  const sections = useMemo(() => groupByDate(filtered), [filtered]);

  const handleRowPress = (tx: StellarPayment) => {
    const isSoroban = tx.type === 'invoke_host_function';
    const isSent = !isSoroban && tx.from === smartAccountAddress;
    const direction = isSoroban ? 'created' : isSent ? 'sent' : 'received';

    router.push({
      pathname: '/transaction/[id]',
      params: {
        id: tx.id,
        hash: tx.transactionHash,
        type: tx.type,
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        assetType: tx.assetType,
        assetCode: tx.assetCode ?? 'XLM',
        createdAt: tx.createdAt,
        direction,
        gAddress: tx.from,
      },
    });
  };

  const renderItem = ({ item }: { item: StellarPayment }) => {
    const isSoroban = item.type === 'invoke_host_function';
    const isSent = !isSoroban && item.from === smartAccountAddress;
    const code = item.assetCode ?? 'XLM';
    const amountNum = parseFloat(item.amount);
    const formattedAmount = amountNum.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 7,
    });

    return (
      <Box paddingHorizontal="m">
        <TouchableOpacity activeOpacity={0.7} onPress={() => handleRowPress(item)}>
          <Box
            backgroundColor={isDark ? 'gray900' : 'white'}
            borderRadius={18}
            padding="m"
            flexDirection="row"
            alignItems="center"
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
            <Box
              width={44}
              height={44}
              borderRadius={12}
              backgroundColor={isDark ? 'black' : 'text400'}
              justifyContent="center"
              alignItems="center"
              mr="m"
            >
              <Image source={getTokenIcon(item.assetCode)} style={{ width: 28, height: 28 }} />
            </Box>
            <Box flex={1}>
              <Text variant="h10" color="textPrimary" fontWeight="700">
                {code}
              </Text>
              <Text variant="p8" color="textSecondary">
                {isSoroban ? 'Contract Call' : isSent ? 'Sent' : 'Received'}
              </Text>
            </Box>
            <Box alignItems="flex-end">
              <Text variant="h10" color="textPrimary" fontWeight="700">
                {isSoroban ? '—' : `${isSent ? '-' : '+'}${formattedAmount} ${code}`}
              </Text>
              <Text variant="p8" color="textSecondary">
                {formatRelativeTime(item.createdAt)}
              </Text>
            </Box>
          </Box>
        </TouchableOpacity>
      </Box>
    );
  };

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <Box paddingHorizontal="m" mt="l" mb="m" backgroundColor="mainBackground">
      <Text variant="p7" color="textSecondary">
        {title}
      </Text>
    </Box>
  );

  return (
    <Box flex={1} backgroundColor="mainBackground" style={{ paddingTop: insets.top }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <Box
        height={56}
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="m"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="h10" color="textPrimary" fontFamily="SFproSemibold">
          History
        </Text>
      </Box>

      <SearchHeader
        search={search}
        setSearch={setSearch}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        theme={theme}
      />

      {isLoading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator
            size="large"
            style={{ marginTop: '-40%' }}
            color={theme.colors.primary700}
          />
        </Box>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Box
              flex={1}
              height={height / 2}
              justifyContent="center"
              alignItems="center"
              paddingHorizontal="xl"
            >
              <Box
                width={64}
                height={64}
                borderRadius={32}
                backgroundColor={isDark ? 'gray900' : 'gray100'}
                justifyContent="center"
                alignItems="center"
                mb="m"
              >
                <Ionicons name="receipt-outline" size={28} color={theme.colors.textSecondary} />
              </Box>
              <Text variant="h10" color="textPrimary" fontWeight="700" textAlign="center" mb="xs">
                No transactions yet
              </Text>
              <Text variant="p7" color="textSecondary" textAlign="center">
                {search
                  ? 'No results match your search.'
                  : 'Your transaction history will appear here.'}
              </Text>
            </Box>
          }
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={theme.colors.primary700}
            />
          }
        />
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 16,
  },
});

export default History;
