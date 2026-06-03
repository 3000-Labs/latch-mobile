import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ApprovalSlider from '@/src/components/approval-number/ApprovalSlider';
import ContinueButton from '@/src/components/approval-number/ContinueButton';
import Header from '@/src/components/approval-number/Header';
import TitleSection from '@/src/components/approval-number/TitleSection';
import Box from '@/src/components/shared/Box';
import { Theme } from '@/src/theme/theme';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

const ApprovalNumber = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();

  const params = useLocalSearchParams<{
    walletName: string;
    purpose: string;
    memberCount: string;
    members: string;
  }>();

  const memberCount = Math.max(1, parseInt(params.memberCount ?? '1', 10));
  const [approvals, setApprovals] = useState(1);

  const handleContinue = () => {
    router.push({
      pathname: '/(onboarding)/shared-wallet-review',
      params: {
        walletName: params.walletName,
        purpose: params.purpose,
        approvals: String(approvals),
        memberCount: String(memberCount),
        members: params.members,
      },
    });
  };

  return (
    <Box flex={1} backgroundColor="onboardingbg">
      <LinearGradient
        colors={[theme.colors.gradientLight, theme.colors.gradientDark]}
        locations={[0, 0.2772]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style="light" />

      <Header />

      <Box flex={1} px="m" mt="xs">
        <TitleSection />
        <ApprovalSlider value={approvals} total={memberCount} onChange={setApprovals} />
      </Box>

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

export default ApprovalNumber;
