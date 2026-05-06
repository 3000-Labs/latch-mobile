import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { createPasskeyCredential, storePasskeyCredential } from '@/src/lib/passkey-webauthn';
import { SECURE_KEYS } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@shopify/restyle';
import * as LocalAuthentication from 'expo-local-authentication';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BIOMETRIC_ENABLED_KEY = 'latch_biometric_enabled';
const PIN_KEY = 'latch_pin';
const PIN_LENGTH = 4;

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

const { width } = Dimensions.get('window');

const Biometrics = () => {
  const router = useRouter();
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const insets = useSafeAreaInsets();

  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isUnlockMode = mode === 'unlock';

  // setup mode state
  const [showModal, setShowModal] = useState(false);

  // unlock mode state
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [biometricIcon, setBiometricIcon] = useState<'scan' | 'finger-print'>('scan');

  const keySize = (width - theme.spacing.m * 2 - theme.spacing.m * 2) / 3;

  // ─── Unlock helpers ───────────────────────────────────────────────────────

  const unlockSuccess = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const triggerBiometrics = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Latch',
      disableDeviceFallback: true,
      cancelLabel: 'Use PIN',
    });
    if (result.success) {
      unlockSuccess();
    } else {
      setShowPin(true);
    }
  }, [unlockSuccess]);

  useEffect(() => {
    if (!isUnlockMode) return;

    const init = async () => {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricLabel('Face ID');
        setBiometricIcon('scan');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricLabel('Touch ID');
        setBiometricIcon('finger-print');
      }

      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      if (enabled === 'true') {
        triggerBiometrics();
      } else {
        setShowPin(true);
      }
    };

    init();
  }, [isUnlockMode, triggerBiometrics]);

  const handlePinKey = useCallback(
    async (key: string) => {
      if (key === 'del') {
        setPin((p) => p.slice(0, -1));
        setPinError(false);
        return;
      }
      if (pin.length >= PIN_LENGTH) return;

      const next = pin + key;
      setPin(next);

      if (next.length === PIN_LENGTH) {
        const stored = await SecureStore.getItemAsync(PIN_KEY);
        if (next === stored) {
          unlockSuccess();
        } else {
          Vibration.vibrate(400);
          setPinError(true);
          setTimeout(() => {
            setPin('');
            setPinError(false);
          }, 500);
        }
      }
    },
    [pin, unlockSuccess],
  );

  // ─── Setup helpers ────────────────────────────────────────────────────────

  const proceedToPin = async () => {
    // Block setup on devices with no lock screen at all. Without a device passcode
    // the private key cannot be stored with WHEN_PASSCODE_SET_THIS_DEVICE_ONLY on
    // iOS, and there is no hardware-backed auth boundary on either platform.
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
    if (securityLevel === LocalAuthentication.SecurityLevel.NONE) {
      Alert.alert(
        'Device Passcode Required',
        'To keep your wallet secure, please set a PIN, password, or pattern on your device first, then return to Latch.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    const existingCredId = await SecureStore.getItemAsync(SECURE_KEYS.CREDENTIAL_ID);
    if (!existingCredId) {
      const credential = createPasskeyCredential();
      await storePasskeyCredential(credential, false);
    }
    router.replace('/(onboarding)/set-pin');
  };

  const handleAllow = async () => {
    setShowModal(false);

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        'Biometrics Not Available',
        "Your device doesn't support biometrics or none are enrolled.",
        [{ text: 'OK', onPress: proceedToPin }],
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Register passkey with biometrics',
      disableDeviceFallback: true,
      cancelLabel: 'Cancel',
    });

    if (!result.success) {
      return;
    }

    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');

    // Generate a P-256 passkey credential tied to this biometric consent.
    // Only create if one doesn't already exist (e.g. re-enabling after reinstall).
    // The private key is stored with requireAuthentication: true — it lives in the
    // iOS Keychain / Android Keystore with biometric access control (Secure Enclave
    // on iPhone). Every future signing operation will trigger Face ID / Touch ID.
    const existingCredId = await SecureStore.getItemAsync(SECURE_KEYS.CREDENTIAL_ID);
    if (!existingCredId) {
      const credential = createPasskeyCredential();
      await storePasskeyCredential(credential);
    }

    // Passkey is ready — deploy the smart account directly, no recovery phrase needed.
    router.replace('/(onboarding)/deploy-account');
  };

  // ─── Unlock UI ────────────────────────────────────────────────────────────

  if (isUnlockMode) {
    return (
      <Box flex={1} backgroundColor="mainBackground">
        <StatusBar style={statusBarStyle} />
        <View style={{ flex: 1 }}>
          {/* Header */}
          <Box alignItems="center" mt="xxl" mb="m" style={{ paddingTop: insets.top }}>
            <Image
              source={require('@/src/assets/images/logosym.png')}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
          </Box>

          {showPin ? (
            <>
              {/* PIN title */}
              <Box alignItems="center" mt="xl" paddingHorizontal="m">
                <Text
                  variant="h8"
                  fontSize={28}
                  fontWeight="700"
                  textAlign="center"
                  color="textPrimary"
                >
                  Welcome Back
                </Text>
                <Text variant="body" color="textSecondary" mt="s" textAlign="center">
                  Enter your PIN to unlock
                </Text>
              </Box>

              {/* PIN dots */}
              <Box flexDirection="row" justifyContent="center" mt="xl" mb="xxl" gap="l">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i < pin.length
                        ? {
                            backgroundColor: pinError
                              ? theme.colors.danger900
                              : theme.colors.primary700,
                          }
                        : { backgroundColor: theme.colors.gray900, opacity: 0.8 },
                    ]}
                  />
                ))}
              </Box>

              {/* Keypad */}
              <Box flex={1} justifyContent="flex-end" paddingHorizontal="m" pb="m">
                {KEYPAD_ROWS.map((row, rIdx) => (
                  <Box key={rIdx} flexDirection="row" justifyContent="space-between" mb="m">
                    {row.map((key, kIdx) => {
                      if (key === '') {
                        return biometricLabel !== 'Biometrics' ? (
                          <TouchableOpacity
                            key={kIdx}
                            activeOpacity={0.6}
                            onPress={triggerBiometrics}
                            style={{ width: keySize, height: 64 }}
                          >
                            <Box
                              flex={1}
                              backgroundColor={statusBarStyle !== 'light' ? 'text50' : 'gray900'}
                              borderRadius={16}
                              justifyContent="center"
                              alignItems="center"
                            >
                              <Ionicons
                                name={biometricIcon}
                                size={28}
                                color={theme.colors.primary700}
                              />
                            </Box>
                          </TouchableOpacity>
                        ) : (
                          <Box key={kIdx} style={{ width: keySize, height: 64 }} />
                        );
                      }

                      return (
                        <TouchableOpacity
                          key={kIdx}
                          activeOpacity={0.6}
                          onPress={() => handlePinKey(key)}
                          style={{ width: keySize, height: 64 }}
                        >
                          <Box
                            flex={1}
                            backgroundColor={statusBarStyle !== 'light' ? 'text50' : 'gray900'}
                            borderRadius={16}
                            justifyContent="center"
                            alignItems="center"
                          >
                            {key === 'del' ? (
                              <Ionicons
                                name="backspace-outline"
                                size={28}
                                color={theme.colors.textPrimary}
                              />
                            ) : (
                              <Text
                                variant="h8"
                                fontSize={24}
                                fontWeight="600"
                                color={statusBarStyle === 'light' ? 'textPrimary' : 'gray900'}
                              >
                                {key}
                              </Text>
                            )}
                          </Box>
                        </TouchableOpacity>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            <>
              {/* Waiting for biometrics */}
              <Box flex={1} justifyContent="center" alignItems="center" gap="xl">
                <Box
                  backgroundColor="bg800"
                  borderRadius={16}
                  height={115}
                  width={115}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Image
                    source={require('@/src/assets/images/face_id.png')}
                    style={{ width: 80, height: 80, tintColor: theme.colors.primary700 }}
                    resizeMode="contain"
                  />
                </Box>
                <Text variant="h8" fontSize={24} textAlign="center" color="textPrimary">
                  Unlock with {biometricLabel}
                </Text>
              </Box>

              <Box paddingHorizontal="m" pb="xl">
                <Button
                  label={`Use ${biometricLabel}`}
                  variant="primary"
                  onPress={triggerBiometrics}
                  bg="primary700"
                  labelColor="black"
                />
                <Button
                  label="Use PIN instead"
                  variant="outline"
                  onPress={() => setShowPin(true)}
                  mt="m"
                  borderColor={statusBarStyle === 'light' ? 'textWhite' : 'textDark900'}
                  labelColor={statusBarStyle === 'light' ? 'textWhite' : 'black'}
                />
              </Box>
            </>
          )}
        </View>
      </Box>
    );
  }

  // ─── Setup UI ─────────────────────────────────────────────────────────────

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
          alignItems="center"
          justifyContent="center"
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
          label="Enable Biometrics"
          variant="primary"
          onPress={() => setShowModal(true)}
          bg="primary700"
          labelColor="black"
        />
        <Button
          label="Maybe Later"
          variant="outline"
          onPress={proceedToPin}
          mt="m"
          borderColor={statusBarStyle === 'light' ? 'textWhite' : 'textDark900'}
          labelColor={statusBarStyle === 'light' ? 'textWhite' : 'black'}
        />
      </Box>

      {/* iOS-style permission modal */}
      <Modal visible={showModal} transparent animationType="fade">
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
            width="100%"
            style={{ borderWidth: 1, borderColor: theme.colors.bg800 }}
          >
            <Image
              source={require('@/src/assets/images/face_id_green.png')}
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
            />
            <Text variant="h8" color="text200" fontSize={24} mt="l">
              Do you want to allow &quot;Latch&quot; to use Face ID?
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
                onPress={() => {
                  setShowModal(false);
                  proceedToPin();
                }}
              />
              <Button
                flex={1}
                height={52}
                label="Allow"
                variant="secondary"
                bg="blue"
                labelColor="white"
                onPress={handleAllow}
              />
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

const styles = StyleSheet.create({
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});

export default Biometrics;
