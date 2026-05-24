import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddMemberButton from '@/src/components/add-members/AddMemberButton';
import ChooseMethodSheet from '@/src/components/add-members/ChooseMethodSheet';
import ContinueButton from '@/src/components/add-members/ContinueButton';
import EmptyState from '@/src/components/add-members/EmptyState';
import Header from '@/src/components/add-members/Header';
import TitleSection from '@/src/components/add-members/TitleSection';
import Box from '@/src/components/shared/Box';

const AddMembers = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ walletName: string; purpose: string }>();
  const [members, setMembers] = useState<{ name: string; email: string }[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleContinue = () => {
    router.push({
      pathname: '/(auth)/biometric',
      params: {
        from: 'shared',
        walletName: params.walletName,
        purpose: params.purpose,
      },
    });
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style="light" />

      <Header />

      <Box flex={1} px="m">
        <TitleSection />

        <AddMemberButton onPress={() => setSheetVisible(true)} />

        {members.length === 0 && <EmptyState />}
      </Box>

      <Box
        px="m"
        style={{
          paddingBottom: Math.max(insets.bottom, 20),
          paddingTop: 12,
        }}
      >
        <ContinueButton disabled={members.length === 0} onPress={handleContinue} />
      </Box>

      <ChooseMethodSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onPasteAddress={() => setSheetVisible(false)}
        onScanQR={() => setSheetVisible(false)}
        onMemberAdded={(name, email) => {
          setMembers((prev) => [...prev, { name, email }]);
          setSheetVisible(false);
        }}
      />
    </Box>
  );
};

export default AddMembers;
