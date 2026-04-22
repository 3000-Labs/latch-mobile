import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, Image, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const Biometrics = () => {
  const router = useRouter();
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const insets = useSafeAreaInsets();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleEnableBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometrics Not Available',
          "Your device does not support biometric authentication or you haven't enrolled any biometrics.",
          // [{ text: 'OK', onPress: () => {} }],
          [{ text: 'OK', onPress: () => router.replace('/(onboarding)/set-pin') }],
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable Biometric Login',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setShowSuccess(true);
      } else {
        // Handle failure if needed, for now we just stay on the screen or let them try again
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while setting up biometrics.');
      console.error(error);
    }
  };

  return (
    <Box
      flex={1}
      backgroundColor="mainBackground"
      paddingHorizontal="m"
      style={{ paddingTop: insets.top }}
    >
      <StatusBar style={statusBarStyle} />

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Image
          source={require('@/src/assets/images/logosym.png')}
          style={{ width: 35, height: 35 }}
          resizeMode="contain"
        />
        <Box width={24} />
      </Box>

      {/* Title */}
      <Box alignItems="center" mt="l">
        <Text variant="h7" fontSize={32} textAlign="center">
          Secure Your Account
        </Text>
        <Text variant="p5" color="textSecondary" mt="m" textAlign="center" style={{ width: '80%' }}>
          Gain quick and secure access to your account using biometrics.
        </Text>
      </Box>

      {/* Face ID Icon */}
      <Box flex={1} justifyContent="center" alignItems="center">
        <Box
          backgroundColor="bg800"
          borderRadius={16}
          height={115}
          width={115}
          alignItems={'center'}
          justifyContent={'center'}
        >
          <Image
            source={require('@/src/assets/images/face_id.png')}
            style={{ width: 80, height: 80, tintColor: theme.colors.primary700 }}
            resizeMode="contain"
          />
        </Box>
      </Box>

      {/* Buttons */}
      <Box pb="xl">
        <Button
          label="Enable"
          variant="primary"
          // onPress={handleEnableBiometrics}
          onPress={() => setShowSuccess(true)}
          bg="primary700"
          labelColor="black"
        />
        <Button
          label="Maybe Later"
          variant="outline"
          onPress={() => router.replace('/(onboarding)/set-pin')}
          mt="m"
          borderColor={statusBarStyle === 'light' ? 'textWhite' : 'textDark900'}
          labelColor={statusBarStyle === 'light' ? 'textWhite' : 'black'}
        />
      </Box>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <Box
          flex={1}
          justifyContent="center"
          alignItems="center"
          paddingHorizontal="m"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
        >
          <Box
            backgroundColor="bg900"
            py="xl"
            px="l"
            borderRadius={32}
            // alignItems="center"
            width="100%"
            style={{
              borderWidth: 1,
              borderColor: theme.colors.bg800,
            }}
          >
            <Image
              source={require('@/src/assets/images/face_id_green.png')}
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
            />

            <Text variant="h8" fontSize={24} mt="l">
              Do you want to allow “Latch” to use Face ID?
            </Text>
            <Text variant="p5" color="text200" mt="m">
              Allow Latch to access your Face ID biometric data.
            </Text>

            <Box flexDirection="row" gap="m" mt="xl" width="100%">
              <Button
                flex={1}
                height={52}
                label="Don't Allow"
                bg="bg800"
                labelColor="white"
                variant="secondary"
                onPress={() => setShowSuccess(false)}
              />
              <Button
                flex={1}
                height={52}
                label="Allow"
                variant="secondary"
                bg="blue"
                labelColor="white"
                onPress={() => {
                  setShowSuccess(false);
                  handleEnableBiometrics();
                }}
              />
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default Biometrics;
