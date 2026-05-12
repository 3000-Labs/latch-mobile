/**
 * CollectEmail — two-phase screen for email-based auth and account recovery.
 *
 * mode=register (default): onboarding flow
 *   Phase 1 → POST /auth/register → Phase 2 → POST /auth/verify → deploy-account
 *
 * mode=recovery: account recovery flow
 *   Phase 1 → POST /recovery/initiate → Phase 2 → POST /recovery/verify
 *           → GET /recovery/blob → restore keys → set-pin
 */

import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import {
  fetchAndRestoreBackup,
  initiateRecovery,
  registerEmail,
  saveAuthTokens,
  verifyOTP,
  verifyRecoveryOTP,
} from '@/src/api/latch-auth';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@shopify/restyle';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Phase = 'email' | 'otp';

const CollectEmail = () => {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isRecovery = mode === 'recovery';

  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRef = useRef<TextInput>(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendCooldown = () => {
    setResendCooldown(60);
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      if (isRecovery) {
        await initiateRecovery(trimmed);
      } else {
        await registerEmail(trimmed);
      }
      setEmail(trimmed);
      setPhase('otp');
      startResendCooldown();
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      if (isRecovery) {
        const recoveryToken = await verifyRecoveryOTP(email, otp.trim());
        await fetchAndRestoreBackup(recoveryToken);
        // Mark onboarding complete so the app doesn't loop back to onboarding
        await AsyncStorage.setItem('latch_onboarding_complete', 'true');
        // Passkey credential is restored — navigate to set-pin so user sets a
        // new PIN (PIN is not backed up). from=recovery skips deploy-account.
        router.replace({ pathname: '/(onboarding)/set-pin', params: { from: 'recovery' } });
      } else {
        const { accessToken, refreshToken } = await verifyOTP(email, otp.trim());
        await saveAuthTokens(accessToken, refreshToken, email);
        router.replace('/(onboarding)/deploy-account');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Invalid or expired code. Please try again.');
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setOtp('');
    setError('');
    setIsLoading(true);
    try {
      if (isRecovery) {
        await initiateRecovery(email);
      } else {
        await registerEmail(email);
      }
      startResendCooldown();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  const title = isRecovery
    ? phase === 'email'
      ? 'Recover Your Account'
      : 'Check Your Email'
    : phase === 'email'
      ? 'Secure Your Recovery'
      : 'Check Your Email';

  const subtitle = isRecovery
    ? phase === 'email'
      ? 'Enter the email you used when setting up Latch.'
      : `We sent a recovery code to ${email}`
    : phase === 'email'
      ? 'Add an email so you can recover your wallet if you lose your device.'
      : `We sent a verification code to ${email}`;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Box
        flex={1}
        backgroundColor="mainBackground"
        paddingHorizontal="m"
        style={{ paddingTop: insets.top }}
      >
        <StatusBar style={statusBarStyle} />

        {/* Header */}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
          <TouchableOpacity
            onPress={() => {
              if (phase === 'otp') {
                setPhase('email');
                setOtp('');
                setError('');
              } else {
                router.back();
              }
            }}
            disabled={isLoading}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isLoading ? theme.colors.textSecondary : theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <Image
            source={require('@/src/assets/images/logosym.png')}
            style={{ width: 35, height: 35 }}
            resizeMode="contain"
          />
          <Box width={24} />
        </Box>

        {/* Title */}
        <Box alignItems="center" mt="xl" mb="xxl">
          <Text variant="h7" fontSize={30} textAlign="center" fontWeight="700" color="textPrimary">
            {title}
          </Text>
          <Text
            variant="body"
            color="textSecondary"
            mt="s"
            textAlign="center"
            style={{ width: '85%' }}
          >
            {subtitle}
          </Text>
        </Box>

        {/* Input */}
        {phase === 'email' ? (
          <Box
            backgroundColor={statusBarStyle !== 'light' ? 'text50' : 'gray900'}
            borderRadius={16}
            paddingHorizontal="m"
            height={56}
            justifyContent="center"
            mb="m"
          >
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError('');
              }}
              placeholder="your@email.com"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSendCode}
              style={[styles.input, { color: theme.colors.textPrimary }]}
            />
          </Box>
        ) : (
          <Box
            backgroundColor={statusBarStyle !== 'light' ? 'text50' : 'gray900'}
            borderRadius={16}
            paddingHorizontal="m"
            height={56}
            justifyContent="center"
            mb="m"
          >
            <TextInput
              ref={otpInputRef}
              value={otp}
              onChangeText={(t) => {
                setOtp(t.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              placeholder="6-digit code"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              style={[styles.input, { color: theme.colors.textPrimary, letterSpacing: 8 }]}
            />
          </Box>
        )}

        {/* Error */}
        {error !== '' && (
          <Text variant="body" color="danger900" textAlign="center" mb="m">
            {error}
          </Text>
        )}

        {/* Primary button */}
        <Button
          label={
            isLoading ? '' : phase === 'email' ? 'Send Code' : isRecovery ? 'Recover Account' : 'Verify'
          }
          variant={isLoading ? 'disabled' : 'primary'}
          bg={isLoading ? 'btnDisabled' : 'primary700'}
          labelColor={isLoading ? 'gray600' : 'black'}
          onPress={phase === 'email' ? handleSendCode : handleVerify}
          disabled={isLoading}
        />

        {/* Loading indicator inside button area */}
        {isLoading && (
          <Box position="absolute" alignSelf="center" style={{ top: '55%' }}>
            <ActivityIndicator color={theme.colors.primary700} />
          </Box>
        )}

        {/* Resend */}
        {phase === 'otp' && (
          <Box alignItems="center" mt="l">
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0 || isLoading}
              activeOpacity={0.7}
            >
              <Text
                variant="body"
                color={resendCooldown > 0 ? 'textSecondary' : 'primary700'}
                fontWeight="600"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </Box>
        )}

        {/* Skip (register mode only) */}
        {phase === 'email' && !isRecovery && (
          <Box alignItems="center" mt="l">
            <TouchableOpacity
              onPress={() => router.replace('/(onboarding)/deploy-account')}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text variant="body" color="textSecondary">
                Skip for now
              </Text>
            </TouchableOpacity>
          </Box>
        )}
      </Box>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    flex: 1,
    padding: 0,
  },
});

export default CollectEmail;
