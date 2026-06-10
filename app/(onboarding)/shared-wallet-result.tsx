import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '@/src/components/shared-wallet-result/Header';
import MascotSection from '@/src/components/shared-wallet-result/MascotSection';
import ResultButton from '@/src/components/shared-wallet-result/ResultButton';
import ResultTextSection from '@/src/components/shared-wallet-result/ResultTextSection';
import WalletAddressCard from '@/src/components/shared-wallet-result/WalletAddressCard';
import WalletQRSheet from '@/src/components/shared-wallet-result/WalletQRSheet';
import Box from '@/src/components/shared/Box';
import { Theme } from '@/src/theme/theme';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';

const SharedWalletResult = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();

  const params = useLocalSearchParams<{
    success: string;
    walletAddress: string;
    errorMessage: string;
  }>();

  const isSuccess = params.success === 'true';
  const walletAddress = params.walletAddress ?? '';
  const errorMessage = params.errorMessage || undefined;
  const [qrVisible, setQrVisible] = useState(false);

  const handlePrimary = () => {
    if (isSuccess) {
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };
  return (
    <Box flex={1} backgroundColor="mainBackground">
      <LinearGradient
        colors={[theme.colors.gradientLight, theme.colors.gradientDark]}
        locations={[0, 0.2772]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style="light" />

      <Header />

      <ScrollView
        bounces={false}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Box flex={1} px="m" pt="l" justifyContent={'center'}>
          <MascotSection success={isSuccess} />
          <ResultTextSection success={isSuccess} errorMessage={errorMessage} />
        </Box>
      </ScrollView>

      <Box
        px="m"
        style={{
          paddingBottom: Math.max(insets.bottom, 20),
          paddingTop: 12,
        }}
      >
        {isSuccess && (
          <WalletAddressCard address={walletAddress} onShowQR={() => setQrVisible(true)} />
        )}
        <ResultButton success={isSuccess} onPress={handlePrimary} />
      </Box>

      <WalletQRSheet
        visible={qrVisible}
        address={walletAddress}
        onClose={() => setQrVisible(false)}
      />
    </Box>
  );
};

export default SharedWalletResult;
