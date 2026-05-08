import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const RECOMMENDED_DAPPS = [
  {
    id: '1',
    name: 'StellarX',
    description: 'Decentralized exchange',
    icon: require('@/src/assets/token/stellar.png'),
  },
  {
    id: '2',
    name: 'Lobstr',
    description: 'AMM interface',
    icon: require('@/src/assets/token/stellar.png'),
  },
  {
    id: '3',
    name: 'Freighter',
    description: 'Liquidity protocol',
    icon: require('@/src/assets/token/stellar.png'),
  },
];

const TRENDING_ASSETS = [
  {
    id: '1',
    name: 'Tether',
    symbol: 'TT Coin',
    amount: '+$505.00',
    change: '+4.21%',
    icon: require('@/src/assets/token/usdt.png'),
  },
  {
    id: '2',
    name: 'Stellar',
    symbol: 'XLM',
    amount: '+$1,250.00',
    time: '3hrs ago',
    icon: require('@/src/assets/token/stellar.png'),
  },
];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Explore = () => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [showBalance, setShowBalance] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);

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
          Explore
        </Text>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Box paddingHorizontal="m" mt="s">
          {/* Search Bar */}
          <Box
            height={48}
            backgroundColor="bg900"
            borderRadius={12}
            flexDirection="row"
            alignItems="center"
            paddingHorizontal="m"
            borderWidth={1}
            borderColor="bg800"
            mb="l"
          >
            <TextInput
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              placeholder="Search assets or dApps"
              placeholderTextColor={theme.colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
          </Box>

          {/* Banner */}
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
                      contentFit="cover"
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
                  backgroundColor={
                    bannerIndex === i ? 'primary700' : isDark ? 'gray800' : 'gray200'
                  }
                />
              ))}
            </Box>
          </Box>
          {/* Recommended dApps */}
          <Box mb="xl">
            <Text variant="p7" color="textSecondary" mb="m">
              Recommended dApps
            </Text>
            {RECOMMENDED_DAPPS.map((dapp) => (
              <Box
                key={dapp.id}
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
                  <Image source={dapp.icon} style={{ width: 24, height: 24 }} />
                </Box>
                <Box flex={1}>
                  <Text variant="h10" color="textPrimary">
                    {dapp.name}
                  </Text>
                  <Text variant="p8" color="textSecondary">
                    {dapp.description}
                  </Text>
                </Box>
                <TouchableOpacity>
                  <Text variant="p7" color="primary" style={{ fontWeight: '600' }}>
                    Open
                  </Text>
                </TouchableOpacity>
              </Box>
            ))}
          </Box>

          {/* Trending Assets */}
          <Box>
            <Text variant="p7" color="textSecondary" mb="m">
              Trending
            </Text>
            {TRENDING_ASSETS.map((asset) => (
              <Box
                key={asset.id}
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
                  <Image source={asset.icon} style={{ width: 24, height: 24 }} />
                </Box>
                <Box flex={1}>
                  <Text variant="h10" color="textPrimary">
                    {asset.name}
                  </Text>
                  <Text variant="p8" color="textSecondary">
                    {asset.symbol}
                  </Text>
                </Box>
                <Box alignItems="flex-end">
                  <Text variant="h10" color="textPrimary">
                    {asset.amount}
                  </Text>
                  <Text variant="p8" color={asset.change ? 'success700' : 'textSecondary'}>
                    {asset.change || asset.time}
                  </Text>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SFproRegular',
  },
  banner: {
    height: 120,
    borderRadius: 24,
    overflow: 'hidden',
    flexDirection: 'row',
  },
});

export default Explore;
