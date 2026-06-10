import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddMemberButton from '@/src/components/add-members/AddMemberButton';
import ChooseMethodSheet from '@/src/components/add-members/ChooseMethodSheet';
import ContinueButton from '@/src/components/add-members/ContinueButton';
import EmptyState from '@/src/components/add-members/EmptyState';
import Header from '@/src/components/add-members/Header';
import MemberList, { Member } from '@/src/components/add-members/MemberList';
import RemoveMemberSheet from '@/src/components/add-members/RemoveMemberSheet';
import ScanQRSheet from '@/src/components/add-members/ScanQRSheet';
import SelfMemberCard from '@/src/components/add-members/SelfMemberCard';
import TitleSection from '@/src/components/add-members/TitleSection';
import Box from '@/src/components/shared/Box';
import { Theme } from '@/src/theme/theme';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

const AddMembers = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();

  const params = useLocalSearchParams<{ walletName: string; purpose: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [scanVisible, setScanVisible] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const addMember = (name: string, value: string, status: 'pending' | 'added') => {
    setMembers((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, name, value, status }]);
  };

  const confirmRemove = () => {
    if (pendingRemoveId) {
      setMembers((prev) => prev.filter((m) => m.id !== pendingRemoveId));
    }
    setPendingRemoveId(null);
  };

  const handleContinue = () => {
    router.push({
      pathname: '/(onboarding)/approval-number',
      params: {
        walletName: params.walletName,
        purpose: params.purpose,
        memberCount: String(members.length),
        members: JSON.stringify(members),
      },
    });
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

      <Box flex={1} px="m">
        <TitleSection />
        <AddMemberButton onPress={() => setSheetVisible(true)} />

        {/* The creator is always the first signer; their signer is read from the
            local credential at deploy time, so this row is fixed and unremovable. */}
        <SelfMemberCard />

        {members.length === 0 ? (
          <EmptyState />
        ) : (
          <MemberList members={members} onRemove={(id) => setPendingRemoveId(id)} />
        )}
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
        onScanQR={() => {
          setSheetVisible(false);
          setTimeout(() => setScanVisible(true), 300);
        }}
        onMemberAdded={(name, value, status) => {
          addMember(name, value, status);
          setSheetVisible(false);
        }}
      />

      <ScanQRSheet
        visible={scanVisible}
        onClose={() => setScanVisible(false)}
        onMemberAdded={(name, address) => {
          addMember(name, address, 'added');
          setScanVisible(false);
        }}
      />

      <RemoveMemberSheet
        visible={pendingRemoveId !== null}
        onCancel={() => setPendingRemoveId(null)}
        onConfirm={confirmRemove}
      />
    </Box>
  );
};

export default AddMembers;
