import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Dimensions, Image } from 'react-native';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Switch from '@/src/components/shared/Switch';
import Text from '@/src/components/shared/Text';

const { width } = Dimensions.get('window');

const Biometrics = () => {
  const router = useRouter();
  const statusBarStyle = useStatusBarStyle();
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  return (
    <Box
      flex={1}
      backgroundColor="mainBackground"
      paddingHorizontal="xl"
      paddingTop="xl"
      paddingBottom="none"
    >
      <StatusBar style={statusBarStyle} />

      <Box flex={1} justifyContent="center" alignItems="center" paddingBottom="l">
        <Image
          source={require('@/src/assets/images/success.png')}
          style={{ width: width * 0.5, height: width * 0.5 }}
          resizeMode="contain"
        />

        <Box alignItems="center" mt="xl">
          <Text variant="h7" fontSize={32} textAlign="center">
            Secure Your Wallet
          </Text>
          <Text
            variant="p5"
            color="textSecondary"
            mt="m"
            textAlign="center"
            style={{ marginHorizontal: 'auto', width: width * 0.85 }}
          >
            Enable biometric authentication to ensure only you can access your account.
          </Text>
        </Box>
        <Box
          backgroundColor={statusBarStyle !== 'dark' ? 'bg800' : 'text500'}
          borderRadius={16}
          padding="m"
          mt={'xxl'}
          marginBottom="xl"
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box flexDirection="row" alignItems="center" flex={1}>
            <Box marginRight="m">
              <Image
                source={require('@/src/assets/images/face_id.png')}
                style={{
                  width: 24,
                  height: 24,
                  tintColor: statusBarStyle !== 'dark' ? 'white' : 'black',
                }}
                resizeMode="contain"
              />
            </Box>
            <Box flex={1}>
              <Text variant="h10" color={statusBarStyle !== 'dark' ? 'text50' : 'black'}>
                Biometric Authentication
              </Text>
              <Text variant="p7" color="textSecondary" mt="xs">
                Use Face ID or Touch ID
              </Text>
            </Box>
          </Box>
          <Switch value={biometricEnabled} onValueChange={setBiometricEnabled} />
        </Box>
      </Box>

      <Box pb="xl">
        <Button
          label="Next"
          variant="primary"
          onPress={() => router.replace('/(onboarding)/get-started')}
          bg="primary700"
          labelColor="black"
        />
      </Box>
    </Box>
  );
};

export default Biometrics;
