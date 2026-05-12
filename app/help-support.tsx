import SupportItem from '@/src/components/profile/SupportItem';
import Box from '@/src/components/shared/Box';
import UtilityHeader from '@/src/components/shared/UtilityHeader';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView } from 'react-native';

const HelpSupportScreen = () => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <Box
      flex={1}
      backgroundColor="cardbg"
      style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}
    >
      <StatusBar style="light" />

      <UtilityHeader title="Help & Support" onBack={handleBack} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <SupportItem
          title="Live Chat Support"
          description="Chat with our support team"
          icon="chatbubble-outline"
          image={require('@/src/assets/icon/chatbubble.png')}
          onPress={() => {}}
        />
        <SupportItem
          title="Email Support"
          description="support@latch.com"
          icon="mail-outline"
          onPress={() => {}}
        />
      </ScrollView>
    </Box>
  );
};

export default HelpSupportScreen;
