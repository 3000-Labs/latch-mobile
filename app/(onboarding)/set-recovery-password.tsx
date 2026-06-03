/**
 * SetRecoveryPassword — collects and confirms the recovery password.
 *
 * mode=set (onboarding): user creates a new recovery password.
 *   Stores it temporarily in SECURE_KEYS.RECOVERY_PASSWORD_SESSION then
 *   navigates to deploy-account where it is consumed by uploadBackup().
 *
 * mode=enter (recovery): user enters their existing recovery password.
 *   Fetches the encrypted backup blob and decrypts it client-side, then
 *   navigates to set-pin so the user can set a new PIN.
 */

import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { fetchAndRestoreBackup } from '@/src/api/latch-auth';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { SECURE_KEYS } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { Formik } from 'formik';
import React from 'react';
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
import * as Yup from 'yup';

const setSchema = Yup.object({
  password: Yup.string().min(8, 'Must be at least 8 characters').required('Required'),
  confirm: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Required'),
});

const enterSchema = Yup.object({
  password: Yup.string().min(8, 'Must be at least 8 characters').required('Required'),
  confirm: Yup.string(),
});

const SetRecoveryPassword = () => {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { mode, recoveryToken, flow } = useLocalSearchParams<{
    mode?: string;
    recoveryToken?: string;
    flow?: string;
  }>();

  const isEnter = mode === 'enter';
  const schema = isEnter ? enterSchema : setSchema;

  const title = isEnter ? 'Enter Recovery Password' : 'Create Recovery Password';
  const subtitle = isEnter
    ? 'Enter the recovery password you set when you created your wallet.'
    : 'This password encrypts your wallet backup. Write it down — if you forget it, your backup cannot be recovered.';

  const handleSubmit = async (
    values: { password: string; confirm: string },
    { setSubmitting, setFieldError }: any,
  ) => {
    try {
      if (isEnter) {
        if (!recoveryToken) throw new Error('Missing recovery token');
        await fetchAndRestoreBackup(recoveryToken, values.password);
        await AsyncStorage.setItem('latch_onboarding_complete', 'true');
        router.replace({ pathname: '/(onboarding)/set-pin', params: { from: 'recovery' } });
      } else {
        await SecureStore.setItemAsync(SECURE_KEYS.RECOVERY_PASSWORD_SESSION, values.password);
        // Both flows deploy the creator's personal account first via deploy-account.
        // For the shared flow we carry `flow` through so deploy-account continues
        // into the multisig build screens (create-shared) instead of the dashboard.
        router.replace({
          pathname: '/(onboarding)/deploy-account',
          params: flow === 'shared' ? { flow: 'shared' } : undefined,
        });
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Something went wrong. Please try again.';
      setFieldError(
        'password',
        msg.includes('Incorrect') || msg.includes('password')
          ? msg
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Box
        flex={1}
        backgroundColor="onboardingbg"
        paddingHorizontal="m"
        style={{ paddingTop: insets.top }}
      >
        <LinearGradient
          colors={[theme.colors.gradientLight, theme.colors.gradientDark]}
          locations={[0, 0.2772]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
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

        <Formik
          initialValues={{ password: '', confirm: '' }}
          validationSchema={schema}
          onSubmit={handleSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit: submit,
            values,
            errors,
            touched,
            isSubmitting,
          }) => (
            <Box>
              {/* Password field */}
              <Box
                backgroundColor={statusBarStyle !== 'light' ? 'text50' : 'gray900'}
                borderRadius={16}
                paddingHorizontal="m"
                height={56}
                justifyContent="center"
                mb="s"
              >
                <TextInput
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  placeholder="Recovery password"
                  placeholderTextColor={theme.colors.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType={isEnter ? 'done' : 'next'}
                  onSubmitEditing={isEnter ? () => submit() : undefined}
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                />
              </Box>

              {touched.password && errors.password ? (
                <Text variant="body" color="danger900" mb="s" ml="xs">
                  {errors.password}
                </Text>
              ) : null}

              {/* Confirm field — only for set mode */}
              {!isEnter && (
                <>
                  <Box
                    backgroundColor={statusBarStyle !== 'light' ? 'text50' : 'gray900'}
                    borderRadius={16}
                    paddingHorizontal="m"
                    height={56}
                    justifyContent="center"
                    mb="s"
                    mt="s"
                  >
                    <TextInput
                      value={values.confirm}
                      onChangeText={handleChange('confirm')}
                      onBlur={handleBlur('confirm')}
                      placeholder="Confirm password"
                      placeholderTextColor={theme.colors.textSecondary}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      // returnKeyType="done"
                      onSubmitEditing={() => submit()}
                      style={[styles.input, { color: theme.colors.textPrimary }]}
                    />
                  </Box>

                  {touched.confirm && errors.confirm ? (
                    <Text variant="body" color="danger900" mb="s" ml="xs">
                      {errors.confirm}
                    </Text>
                  ) : null}
                </>
              )}

              <Box mt="m">
                <Button
                  label={isSubmitting ? '' : isEnter ? 'Restore Wallet' : 'Continue'}
                  variant={isSubmitting ? 'disabled' : 'primary'}
                  bg={isSubmitting ? 'btnDisabled' : 'primary700'}
                  labelColor={isSubmitting ? 'gray600' : 'black'}
                  onPress={() => submit()}
                  disabled={isSubmitting}
                />
              </Box>

              {isSubmitting && (
                <Box position="absolute" alignSelf="center" style={{ top: isEnter ? 72 : 140 }}>
                  <ActivityIndicator color={theme.colors.primary700} />
                </Box>
              )}
            </Box>
          )}
        </Formik>
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

export default SetRecoveryPassword;
