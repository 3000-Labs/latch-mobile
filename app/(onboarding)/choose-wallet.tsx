import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ContinueButton from '@/src/components/choose-wallet/ContinueButton';
import Header from '@/src/components/choose-wallet/Header';
import TitleSection from '@/src/components/choose-wallet/TitleSection';
import WalletOptionCard from '@/src/components/choose-wallet/WalletOptionCard';
import Box from '@/src/components/shared/Box';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

type WalletType = 'personal' | 'shared';

const ChooseWallet = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<WalletType>('personal');

  const handleContinue = () => {
    if (selectedType === 'personal') {
      // Go to biometric / personal wallet creation flow
      router.push('/(auth)/biometric');
    } else if (selectedType === 'shared') {
      // Shared wallets need the creator to be a signer AND backed up, so run the
      // same identity + email setup the personal flow uses. `from: 'shared'` makes
      // set-pin forward into the shared branch instead of the personal deploy.
      router.push({ pathname: '/(auth)/biometric', params: { from: 'shared' } });
    }
  };

  return (
    <Box flex={1} backgroundColor="onboardingbg">
      <LinearGradient
        colors={['rgba(50, 60, 14, 0.74)', '#121212']}
        locations={[0, 0.2772]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.91 }}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style="light" />

      {/* Top Header - Back Button & Centered Logo (Notch Safe) */}
      <Header />

      {/* Main content scroll/body area */}
      <Box flex={1} px="m" justifyContent="flex-start" mt="xs">
        {/* Large centered title section */}
        <TitleSection />

        {/* List of custom wallet option cards */}
        <Box gap="m" width="100%">
          <WalletOptionCard
            title="Personal Wallet"
            description="Manage your assets yourself"
            isSelected={selectedType === 'personal'}
            onPress={() => setSelectedType('personal')}
          />

          <WalletOptionCard
            title="Multisig Wallet"
            description="Create a wallet that multiple people can approve"
            isSelected={selectedType === 'shared'}
            onPress={() => setSelectedType('shared')}
          />
        </Box>
      </Box>

      {/* Bottom Continue Button (Safe Area Aware) */}
      <Box
        px="m"
        style={{
          paddingBottom: Math.max(insets.bottom, 20),
          paddingTop: 12,
        }}
      >
        <ContinueButton onPress={handleContinue} />
      </Box>
    </Box>
  );
};

export default ChooseWallet;
