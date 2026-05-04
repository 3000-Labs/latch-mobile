import SearchHeader from '@/src/components/history/SearchHeader';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FILTERS = ['All', 'Sent', 'Received', 'Deposit', 'Swaps'];

const TRANSACTIONS = [
  {
    id: '1',
    tokenName: 'Tether',
    tokenIcon: require('@/src/assets/token/usdt.png'),
    status: 'Completed',
    amount: '+$505.00',
    time: '2hrs ago',
    date: 'Today',
  },
  {
    id: '2',
    tokenName: 'Ethereum',
    tokenIcon: require('@/src/assets/token/eth.png'),
    status: 'Completed',
    amount: '+$1,250.00',
    time: '2hrs ago',
    date: 'Today',
  },
  {
    id: '3',
    tokenName: 'Stellar',
    tokenIcon: require('@/src/assets/token/stellar.png'),
    status: 'Pending Transaction',
    amount: '+$1,250.00',
    time: '3hrs ago',
    date: 'Today',
  },
  {
    id: '4',
    tokenName: 'Stellar',
    tokenIcon: require('@/src/assets/token/stellar.png'),
    status: 'Pending Transaction',
    amount: '+$1,250.00',
    time: '6hrs ago',
    date: 'Today',
  },
  {
    id: '5',
    tokenName: 'Tether',
    tokenIcon: require('@/src/assets/token/usdt.png'),
    status: 'Completed',
    amount: '+$505.00',
    time: '2hrs ago',
    date: 'Yesterday',
  },
  {
    id: '6',
    tokenName: 'Ethereum',
    tokenIcon: require('@/src/assets/token/eth.png'),
    status: 'Completed',
    amount: '+$1,250.00',
    time: '2hrs ago',
    date: 'Yesterday',
  },
];

const History = () => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

  const sectionData = Object.entries(
    TRANSACTIONS.reduce(
      (acc, tx) => {
        if (!acc[tx.date]) {
          acc[tx.date] = [];
        }
        acc[tx.date].push(tx);
        return acc;
      },
      {} as Record<string, typeof TRANSACTIONS>,
    ),
  ).map(([date, data]) => ({
    title: date,
    data: data,
  }));

  const renderItem = ({ item }: { item: (typeof TRANSACTIONS)[0] }) => (
    <Box paddingHorizontal="m">
      <Box
        backgroundColor="bg900"
        borderRadius={18}
        padding="m"
        flexDirection="row"
        alignItems="center"
        mb="s"
      >
        <Box
          width={44}
          height={44}
          borderRadius={12}
          backgroundColor="bg800"
          justifyContent="center"
          alignItems="center"
          mr="m"
        >
          <Image source={item.tokenIcon} style={{ width: 24, height: 24 }} />
        </Box>
        <Box flex={1}>
          <Text variant="h10" color="textPrimary">
            {item.tokenName}
          </Text>
          <Text variant="p8" color="textSecondary">
            {item.status}
          </Text>
        </Box>
        <Box alignItems="flex-end">
          <Text variant="h10" color="textPrimary">
            {item.amount}
          </Text>
          <Text variant="p8" color="textSecondary">
            {item.time}
          </Text>
        </Box>
      </Box>
    </Box>
  );

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <Box paddingHorizontal="m" mt="l" mb="m" backgroundColor="mainBackground">
      <Text variant="p7" color="textSecondary">
        {title}
      </Text>
    </Box>
  );

  return (
    <Box flex={1} backgroundColor="mainBackground" style={{ paddingTop: insets.top }}>
      <StatusBar style="light" />

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

      <SectionList
        sections={sectionData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      />
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
