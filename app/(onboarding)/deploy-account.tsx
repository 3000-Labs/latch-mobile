/**
 * DeployAccount — deploys the user's passkey-backed Soroban smart account.
 *
 * Primary path (passkey): credentials were created on the biometric screen;
 * this screen retrieves them from SecureStore and deploys via the factory contract.
 *
 * Legacy path (import-phrase): mnemonic was saved to SecureStore by set-pin.tsx;
 * this screen reads it from there — no route params needed.
 */

import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { deploySmartAccount as deploySmartAccountPasskey } from '@/src/api/passkey';
import { deploySmartAccount as deploySmartAccountEd25519 } from '@/src/api/smart-account';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { createPasskeyCredential, storePasskeyCredential } from '@/src/lib/passkey-webauthn';
import { restoreStellarWallet } from '@/src/lib/seed-wallet';
import { SECURE_KEYS, useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useTheme } from '@shopify/restyle';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet } from 'react-native';

type Stage =
  | 'auth' // verifying credentials / passkey gate
  | 'deploying' // waiting on Soroban RPC
  | 'success' // all done
  | 'error'; // deployment failed

const STAGE_LABELS: Record<Stage, string> = {
  auth: 'Verifying your identity…',
  deploying: 'Deploying your smart account…\nThis can take up to 30 seconds.',
  success: 'Your smart account is ready!',
  error: 'Something went wrong',
};

/**
 * Require successful biometric authentication.
 * Throws if the device has no enrolled biometrics or if the user cancels / fails auth.
 */
async function requireBiometricAuth(promptMessage: string): Promise<void> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    throw new Error(
      'Biometric authentication is required to deploy your smart account. ' +
        'Please enroll a biometric (fingerprint or face) on your device and try again.',
    );
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });

  if (!result.success) {
    throw new Error('Biometric authentication failed. Please try again.');
  }
}

/**
 * Return passkey credentials from SecureStore.
 * Credentials are created on the biometric setup screen, so by the time we reach
 * this screen they should always exist.
 * If for some reason they are missing (e.g. direct deep-link or retry after wipe),
 * we re-create them with the appropriate auth gate for this device:
 *   - Biometric devices  → require Face ID / Touch ID before re-creating
 *   - PIN-only devices   → no extra prompt (device passcode is the boundary;
 *                          the user's app PIN was already verified at unlock)
 * keyDataHex = uncompressed P-256 pubkey (65 bytes, 130 hex) + credentialId (16 bytes, 32 hex)
 */
async function getOrCreatePasskeyCredentials(): Promise<{
  credentialId: string;
  keyDataHex: string;
}> {
  const existingCredId = await SecureStore.getItemAsync(SECURE_KEYS.CREDENTIAL_ID);
  const existingKeyData = await SecureStore.getItemAsync(SECURE_KEYS.KEY_DATA_HEX);

  if (existingCredId && existingKeyData) {
    return { credentialId: existingCredId, keyDataHex: existingKeyData };
  }

  // Credentials missing — re-create with the auth mode that was chosen at setup.
  const requiresBiometric = await SecureStore.getItemAsync(SECURE_KEYS.PASSKEY_REQUIRES_BIOMETRIC);
  const useBiometric = requiresBiometric !== 'false';

  if (useBiometric) {
    await requireBiometricAuth('Authenticate to create your secure passkey');
  }

  const credential = createPasskeyCredential();
  await storePasskeyCredential(credential, useBiometric);

  return { credentialId: credential.credentialId, keyDataHex: credential.keyDataHex };
}

const DeployAccount = () => {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const router = useRouter();
  const { setActiveWallet, setSmartAccountAddress } = useWalletStore();

  const [stage, setStage] = useState<Stage>('auth');
  const [errorMsg, setErrorMsg] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isMnemonicPath, setIsMnemonicPath] = useState(false);

  // Pulse animation for the spinner container
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Run deployment on mount and on each retry
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // ── Step 1: determine deploy path from SecureStore ────────────────────
        const storedMnemonic = await SecureStore.getItemAsync(SECURE_KEYS.MNEMONIC);

        if (cancelled) return;

        // ── Step 2: deploy smart account ──────────────────────────────────────
        let deployedAddress: string;

        if (storedMnemonic) {
          // Import-wallet path: derive Ed25519 pubkey from mnemonic and deploy.
          // No biometric auth needed — the mnemonic itself proves ownership.
          setIsMnemonicPath(true);
          setStage('deploying');
          const wallet = restoreStellarWallet(storedMnemonic);
          const result = await deploySmartAccountEd25519(wallet.publicKeyHex);
          deployedAddress = result.smartAccountAddress;
        } else {
          // New-wallet path: passkey / biometric credential created on the
          // biometric setup screen; retrieve it and deploy with WebAuthn signer.
          setStage('auth');
          const { credentialId, keyDataHex } = await getOrCreatePasskeyCredentials();
          if (cancelled) return;
          setStage('deploying');
          const result = await deploySmartAccountPasskey(credentialId, keyDataHex);
          if (result.error) throw new Error(result.error);
          deployedAddress = result.smartAccountAddress;
        }

        if (cancelled) return;

        // ── Step 3: persist smart account address ─────────────────────────────
        await SecureStore.setItemAsync(SECURE_KEYS.SMART_ACCOUNT, deployedAddress);

        // ── Step 4: mark onboarding complete and hydrate store ────────────────
        await AsyncStorage.setItem('latch_onboarding_complete', 'true');
        if (storedMnemonic) {
          const wallet = restoreStellarWallet(storedMnemonic);
          setActiveWallet(wallet);
        }
        setSmartAccountAddress(deployedAddress);

        if (!cancelled) {
          // Surface success — user explicitly taps "Go to Dashboard" to proceed.
          setStage('success');
        }
      } catch (err: any) {
        __DEV__ && console.log(err);
        if (!cancelled) {
          setErrorMsg(err?.message ?? 'Deployment failed. Please try again.');
          setStage('error');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  // retryCount is the only trigger that changes — all other deps are stable route params/store setters
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  const goToDashboard = () => {
    router.replace({
      pathname: '/(auth)/thank-you',
      params: {
        title: 'Your Smart Account is Ready',
        subtext: 'Start using your secure Stellar wallet today',
        buttonLabel: 'Go to Dashboard',
        imageSource: 'success',
      },
    });
  };

  const retry = () => {
    setErrorMsg('');
    setStage('auth');
    setRetryCount((c) => c + 1);
  };

  const isSpinning = stage === 'auth' || stage === 'deploying';

  return (
    <Box flex={1} backgroundColor="mainBackground" justifyContent="center" alignItems="center">
      <StatusBar style={statusBarStyle} />

      <Box alignItems="center" paddingHorizontal="xl" gap="xl">
        {/* Logo */}
        <Image
          source={require('@/src/assets/images/logosym.png')}
          style={{ width: 64, height: 64 }}
          resizeMode="contain"
        />

        {/* Animated spinner / success / error indicator */}
        <Animated.View
          style={[
            styles.circle,
            {
              backgroundColor:
                stage === 'error' ? theme.colors.danger900 + '22' : theme.colors.primary700 + '22',
              borderColor: stage === 'error' ? theme.colors.danger900 : theme.colors.primary700,
              transform: [{ scale: isSpinning ? pulse : 1 }],
            },
          ]}
        >
          {isSpinning && <ActivityIndicator size="large" color={theme.colors.primary700} />}
          {stage === 'success' && (
            <Text variant="h7" fontSize={40}>
              ✓
            </Text>
          )}
          {stage === 'error' && (
            <Text variant="h7" fontSize={40}>
              ✕
            </Text>
          )}
        </Animated.View>

        {/* Stage label */}
        <Box alignItems="center" gap="s">
          <Text variant="h8" fontSize={22} fontWeight="700" textAlign="center" color="textPrimary">
            {stage === 'success'
              ? 'All done!'
              : stage === 'error'
                ? 'Deployment Failed'
                : 'Setting up…'}
          </Text>
          <Text variant="body" color="textSecondary" textAlign="center" lineHeight={22}>
            {stage === 'error' ? errorMsg : STAGE_LABELS[stage]}
          </Text>
        </Box>

        {/* Progress steps — visible while loading */}
        {isSpinning && (
          <Box gap="s" width="100%">
            {[
              {
                label: isMnemonicPath ? 'Wallet imported' : 'Passkey credential verified',
                done: stage === 'deploying',
              },
              { label: 'Deploying on Stellar', done: false },
            ].map(({ label, done }) => (
              <Box key={label} flexDirection="row" alignItems="center" gap="m">
                <Box
                  width={20}
                  height={20}
                  borderRadius={10}
                  backgroundColor={done ? 'primary700' : 'gray900'}
                  justifyContent="center"
                  alignItems="center"
                >
                  {done && (
                    <Text variant="body" fontSize={12} color="textWhite">
                      ✓
                    </Text>
                  )}
                </Box>
                <Text variant="body" color={done ? 'textPrimary' : 'textSecondary'}>
                  {label}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Action buttons */}
        {stage === 'success' && (
          <Box width="100%" mt="m">
            <Button
              label="Go to Dashboard"
              variant="primary"
              onPress={goToDashboard}
              bg="primary700"
              labelColor="black"
            />
          </Box>
        )}

        {stage === 'error' && (
          <Box width="100%" gap="m" mt="m">
            <Button
              label="Try Again"
              variant="primary"
              onPress={retry}
              bg="primary700"
              labelColor="black"
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DeployAccount;
