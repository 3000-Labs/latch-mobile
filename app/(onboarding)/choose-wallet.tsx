import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import Box from '@/src/components/shared/Box';
import Header from '@/src/components/choose-wallet/Header';
import TitleSection from '@/src/components/choose-wallet/TitleSection';
import WalletOptionCard from '@/src/components/choose-wallet/WalletOptionCard';
import ContinueButton from '@/src/components/choose-wallet/ContinueButton';

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
      router.push('/(onboarding)/create-shared');
    }
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
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
            title="Shared Wallet"
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
