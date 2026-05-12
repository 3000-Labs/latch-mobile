import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import UtilityHeader from '@/src/components/shared/UtilityHeader';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image } from 'react-native';

const AboutScreen = () => {
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

      <UtilityHeader title="About" onBack={handleBack} />

      <Box flex={1} alignItems="center">
        <Image
          source={require('@/src/assets/images/latch-version.png')}
          style={{ width: 110, height: 103, marginTop: 101 }}
          resizeMode="contain"
        />

        <Text variant="h4" color="textPrimary" fontWeight="700" mt="m">
          Latch
        </Text>
        <Text variant="p6" color="textSecondary" mt="s">
          Version 1.0.0
        </Text>
      </Box>
    </Box>
  );
};

export default AboutScreen;
