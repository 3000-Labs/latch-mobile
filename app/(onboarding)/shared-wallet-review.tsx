import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ApprovalRuleCard from '@/src/components/shared-wallet-review/ApprovalRuleCard';
import CreateWalletButton from '@/src/components/shared-wallet-review/CreateWalletButton';
import Header from '@/src/components/shared-wallet-review/Header';
import MemberReviewList from '@/src/components/shared-wallet-review/MemberReviewList';
import TitleSection from '@/src/components/shared-wallet-review/TitleSection';
import WalletNameCard from '@/src/components/shared-wallet-review/WalletNameCard';
import Box from '@/src/components/shared/Box';

const SharedWalletReview = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    walletName: string;
    purpose: string;
    approvals: string;
    memberCount: string;
    members: string;
  }>();

  const approvals = parseInt(params.approvals ?? '1', 10);
  const memberCount = parseInt(params.memberCount ?? '1', 10);
  const members = params.members ? JSON.parse(params.members) : [];

  const handleCreate = () => {
    router.push({
      pathname: '/(onboarding)/shared-wallet-result',
      params: {
        success: 'true',
        walletAddress: 'GDJKL4NZXQRQXQRQXQRQXQRQXQRQXQRQXQRQXQRQXQRQXQRQXQRQXQ',
      },
    });
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style="light" />

      <Header />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Box flex={1} px="m">
          <TitleSection />
          <WalletNameCard name={params.walletName ?? ''} />
          <MemberReviewList members={members} />
          <ApprovalRuleCard approvals={approvals} total={memberCount} />
        </Box>
      </ScrollView>

      <Box
        px="m"
        style={{
          paddingBottom: Math.max(insets.bottom, 20),
          paddingTop: 12,
        }}
      >
        <CreateWalletButton onPress={handleCreate} />
      </Box>
    </Box>
  );
};

export default SharedWalletReview;
