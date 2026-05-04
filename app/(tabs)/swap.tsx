import { Swap as SwapIcon } from '@/src/components/CustomTabBar';
import Box from '@/src/components/shared/Box';
import Switch from '@/src/components/shared/Switch';
import Text from '@/src/components/shared/Text';
import SwapCard from '@/src/components/swap/SwapCard';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFormik } from 'formik';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Yup from 'yup';

const TOKENS = [
  {
    name: 'Stellar',
    subtitle: 'Stellar USDT',
    icon: require('@/src/assets/token/stellar.png'),
    amount: '0.00',
    value: '≈--',
    walletName: 'My Wallet...670d',
    walletBalance: '0',
    showAddFunds: true,
    showWalletDropdown: true,
  },
  {
    name: 'Tether',
    subtitle: 'Tether USDT',
    icon: require('@/src/assets/token/usdt.png'),
    amount: '--',
    value: '≈--',
    walletName: 'My Wallet...670d',
    walletBalance: '0',
    showAddFunds: false,
    showWalletDropdown: false,
  },
];

const Swap = () => {
  const theme = useTheme<Theme>();
  const isDark = theme.colors.mainBackground === '#000000';
  const insets = useSafeAreaInsets();
  const [useExchangeBalance, setUseExchangeBalance] = useState(false);
  const [fromIndex, setFromIndex] = useState(0);
  const toIndex = fromIndex === 0 ? 1 : 0;

  const rotation = useSharedValue(90);
  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedIconStyle2 = useAnimatedStyle(() => ({
    transform: [{ rotate: '90deg' }],
  }));

  const handleSwap = () => {
    rotation.value = withTiming(rotation.value + 180, { duration: 300 });
    setFromIndex(toIndex);
  };

  const formik = useFormik({
    initialValues: { amount: '' },
    validationSchema: Yup.object({
      amount: Yup.number().positive().required(),
    }),
    onSubmit: () => {},
  });

  const handleAmountChange = (text: string) => {
    // Strip commas, allow only digits and a single decimal point
    const stripped = text.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const parts = stripped.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : stripped;
    formik.setFieldValue('amount', sanitized);
  };

  return (
    <Box flex={1} backgroundColor="mainBackground" style={{ paddingTop: insets.top }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="m"
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="h10" color="textPrimary" fontFamily={'SFproSemibold'}>
          Swap
        </Text>
      </Box>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={{ flex: 1 }}
      >
        <Box paddingHorizontal="m" paddingTop="m">
          {/* From Section Header */}
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            marginBottom="s"
          >
            <Text variant="p7" color="textSecondary">
              From
            </Text>
            <Box flexDirection="row" alignItems="center">
              <Text variant="p7" color="textSecondary" style={styles.exchangeLabel}>
                Use Exchange Balance
              </Text>
              <Switch value={useExchangeBalance} onValueChange={setUseExchangeBalance} />
            </Box>
          </Box>

          {/* First Swap Card (From) */}
          <SwapCard
            tokenName={TOKENS[fromIndex].name}
            tokenSubtitle={TOKENS[fromIndex].subtitle}
            tokenIcon={TOKENS[fromIndex].icon}
            amount={formik.values.amount}
            onAmountChange={handleAmountChange}
            value={
              formik.values.amount
                ? `≈$${parseFloat(formik.values.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '≈$0.00'
            }
            walletName={TOKENS[fromIndex].walletName}
            walletBalance={`${TOKENS[fromIndex].walletBalance} ${TOKENS[fromIndex].name}`}
            walletValue="$0.00"
            showAddFunds={
              parseFloat(formik.values.amount || '0') > parseFloat(TOKENS[fromIndex].walletBalance)
            }
            showWalletDropdown={TOKENS[fromIndex].showWalletDropdown}
          />

          {/* Swap button + From label for second section */}
          <Box flexDirection="row" alignItems="center" mt={'m'} mb={'xs'}>
            <Text variant="p7" color="textSecondary">
              To
            </Text>
            <Box
              flex={1}
              alignItems="center"
              position={'absolute'}
              left={'43%'}
              top={-25}
              style={{ zIndex: 99999, elevation: 9999 }}
            >
              <TouchableOpacity onPress={handleSwap} activeOpacity={0.8}>
                <Box
                  width={56}
                  height={56}
                  borderRadius={28}
                  backgroundColor="primary"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Animated.View style={animatedIconStyle}>
                    <SwapIcon width={24} color="#000000" />
                  </Animated.View>
                </Box>
              </TouchableOpacity>
            </Box>
          </Box>

          {/* Second Swap Card (To) */}
          <SwapCard
            tokenName={TOKENS[toIndex].name}
            tokenSubtitle={TOKENS[toIndex].subtitle}
            tokenIcon={TOKENS[toIndex].icon}
            amount={formik.values.amount || '0.00'}
            value={
              formik.values.amount
                ? `≈$${parseFloat(formik.values.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '≈$0.00'
            }
            walletName={TOKENS[toIndex].walletName}
            walletBalance={`${TOKENS[toIndex].walletBalance} ${TOKENS[toIndex].name}`}
            walletValue="$0.00"
            showAddFunds={false}
            showWalletDropdown={TOKENS[toIndex].showWalletDropdown}
          />

          {/* Approve Swap Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.enterAmountButton}
            onPress={() => router.push('/swap/confirm')}
          >
            <Box
              height={56}
              backgroundColor={formik.values.amount ? 'primary' : 'bg900'}
              borderRadius={28}
              justifyContent="center"
              alignItems="center"
            >
              <Text variant="h10" color="bgDark900" style={{ fontWeight: '600' }}>
                {formik.values.amount ? 'Approve Swap' : 'Enter Amount'}
              </Text>
            </Box>
          </TouchableOpacity>

          {/* Swap Details */}
          <Box mt="xl">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
              <Text variant="p7" color="textSecondary">
                Route
              </Text>
              <Box flexDirection="row" alignItems="center">
                <Image
                  source={require('@/src/assets/images/LiquidMesh.png')}
                  style={{ width: 24, height: 24, borderRadius: 6, marginRight: 8 }}
                />
                <Text variant="p7" color="textPrimary" style={{ marginRight: 8 }}>
                  LiquidMesh
                </Text>
                <Box
                  backgroundColor="bg800"
                  paddingHorizontal="s"
                  paddingVertical="xs"
                  borderRadius={4}
                  style={{ backgroundColor: '#211B0C' }}
                >
                  <Text variant="p8" color="primary" style={{ fontSize: 10 }}>
                    Recommend
                  </Text>
                </Box>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={theme.colors.textSecondary}
                  style={{ marginLeft: 8 }}
                />
              </Box>
            </Box>

            <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
              <Text variant="p7" color="textSecondary">
                Rate
              </Text>
              <Box flexDirection="row" alignItems="center">
                <Text variant="p7" color="textPrimary" style={{ marginRight: 4 }}>
                  1 USDT ≈ 0.00084221 Tet
                </Text>
                <Animated.View style={animatedIconStyle2}>
                  <SwapIcon width={14} color={theme.colors.white} />
                </Animated.View>
              </Box>
            </Box>

            <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
              <Text variant="p7" color="textSecondary">
                Slippage
              </Text>
              <Text variant="p7" color="textPrimary">
                Auto | 0.5%
              </Text>
            </Box>

            <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
              <Text variant="p7" color="textSecondary">
                Min. Received
              </Text>
              <Text variant="p7" color="textPrimary">
                0.000838 B...
              </Text>
            </Box>

            <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
              <Text variant="p7" color="textSecondary">
                Network Fee
              </Text>
              <Text variant="p7" color="textPrimary">
                ~ 0.00001 Stellar
              </Text>
            </Box>
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 52,
  },
  backButton: {
    position: 'absolute',
    left: 16,
  },
  exchangeLabel: {
    marginRight: 8,
  },
  tokenRow: {
    marginBottom: 12,
  },
  tokenIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  tokenName: {
    marginRight: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#3F3F3F',
    marginBottom: 12,
  },
  chevronSmall: {
    marginLeft: 4,
  },
  walletBalance: {
    marginLeft: 4,
  },
  swapRow: {
    paddingVertical: 10,
  },
  amountInput: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'SFproSemibold',
    color: '#FFFFFF',
    textAlign: 'right',
    minWidth: 60,
    padding: 0,
  },
  swapButtonWrapper: {
    alignItems: 'center',
    height: 30, // Reduced height to pull cards closer
    justifyContent: 'center',
    zIndex: 10,
    marginVertical: -15, // Negative margin to overlap with cards
  },
  swapButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFAD00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#000000', // To create the separation effect if needed, though image shows flat orange
  },
  swapIcon: {
    width: 24,
    height: 24,
    tintColor: '#000000',
  },
  enterAmountButton: {
    marginTop: 40,
  },
});

export default Swap;
