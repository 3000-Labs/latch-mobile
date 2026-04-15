import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFormik } from 'formik';
import React from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import * as Yup from 'yup';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const resetPasswordSchema = Yup.object().shape({
  newPassword: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Confirm password is required'),
});

const ResetPassword = () => {
  const theme = useTheme<Theme>();
  const router = useRouter();

  const formik = useFormik({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: resetPasswordSchema,
    onSubmit: (values) => {
      console.log('Password reset with:', values.newPassword);
      // Handle password reset logic here
      router.push({
        pathname: '/(auth)/thank-you',
        params: {
          title: 'Password Reset!',
          subtext: 'Your password has been updated successfully',
          buttonLabel: 'Continue to Login',
          buttonFunction: '/(auth)/login',
          imageSource: 'success',
        },
      });
    },
  });

  const isFormValid = formik.isValid && formik.dirty;

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.m,
            paddingBottom: 40,
            paddingTop: 60,
          }}
        >
          {/* Header Section */}
          <Box flexDirection={'row'} justifyContent={'space-between'}>
            <Box mb="m">
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </Box>

            <Image
              source={require('@/src/assets/images/logosym.png')}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
            <Box width={40} />
          </Box>

          <Box alignItems="center" mb="xxl">
            <Text variant="h7" mt="m" fontSize={32} textAlign="center">
              Create New Password
            </Text>
            <Text variant="p5" color="textSecondary" mt="xs" textAlign="center" width={'80%'}>
              Your new password must be different from previously used passwords
            </Text>
          </Box>

          {/* Form Section */}
          <Box gap="m">
            <Box>
              <Text variant="h11" mb="s" color="textPrimary">
                New Password
              </Text>
              <Input
                placeholder="Enter new password"
                value={formik.values.newPassword}
                onChangeText={formik.handleChange('newPassword')}
                onBlur={formik.handleBlur('newPassword')}
                secureTextEntry
                placeholderTextColor={theme.colors.gray600}
                status={
                  formik.errors.newPassword && formik.touched.newPassword ? 'danger' : 'basic'
                }
                caption={
                  formik.errors.newPassword && formik.touched.newPassword
                    ? () => (
                        <Text variant={'p8'} color={'inputError'}>
                          {formik.errors.newPassword}
                        </Text>
                      )
                    : undefined
                }
                accessoryRight={() => (
                  <Box pr="s">
                    <Ionicons name="lock-closed-outline" size={20} color={theme.colors.gray500} />
                  </Box>
                )}
                style={{
                  backgroundColor: '#111',
                  borderColor:
                    formik.errors.newPassword && formik.touched.newPassword
                      ? '#EA471E'
                      : theme.colors.gray800,
                }}
              />
            </Box>

            <Box>
              <Text variant="h11" mb="s" color="textPrimary">
                Confirm Password
              </Text>
              <Input
                placeholder="Confirm new password"
                value={formik.values.confirmPassword}
                onChangeText={formik.handleChange('confirmPassword')}
                onBlur={formik.handleBlur('confirmPassword')}
                secureTextEntry
                placeholderTextColor={theme.colors.gray600}
                status={
                  formik.errors.confirmPassword && formik.touched.confirmPassword
                    ? 'danger'
                    : 'basic'
                }
                caption={
                  formik.errors.confirmPassword && formik.touched.confirmPassword
                    ? () => (
                        <Text variant={'p8'} color={'inputError'}>
                          {formik.errors.confirmPassword}
                        </Text>
                      )
                    : undefined
                }
                accessoryRight={() => (
                  <Box pr="s">
                    <Ionicons name="lock-closed-outline" size={20} color={theme.colors.gray500} />
                  </Box>
                )}
                style={{
                  backgroundColor: '#111',
                  borderColor:
                    formik.errors.newPassword && formik.touched.newPassword
                      ? '#EA471E'
                      : theme.colors.gray800,
                }}
              />
            </Box>
          </Box>

          <Box mt="xxl">
            <Button
              label="Reset Password"
              variant={isFormValid ? 'primary' : 'disabled'}
              //   onPress={formik.handleSubmit}
              onPress={() =>
                router.push({
                  pathname: '/(auth)/thank-you',
                  params: {
                    title: 'Password Reset Successful',
                    subtext:
                      'Your password has been successfully reset. You can now sign in with your new password.',
                    buttonLabel: 'Proceed',
                    buttonFunction: '/(auth)/login',
                    imageSource: 'success',
                  },
                })
              }
              disabled={!isFormValid}
              labelColor={isFormValid ? 'black' : 'gray600'}
              bg={isFormValid ? 'primary700' : 'btnDisabled'}
            />
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
};

export default ResetPassword;
