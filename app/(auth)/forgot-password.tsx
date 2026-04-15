import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFormik } from 'formik';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Yup from 'yup';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { maskEmail } from '@/src/utils';

const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
});

const width = Dimensions.get('window').width;

const ForgotPassword = () => {
  const theme = useTheme<Theme>();
  const router = useRouter();
  const [resetRequested, setResetRequested] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: forgotPasswordSchema,
    onSubmit: (values) => {
      console.log('Reset link requested for:', values.email);
      // Handle password reset request logic here
      setSubmittedEmail(values.email);
      setResetRequested(true);
    },
  });

  const isFormValid = formik.isValid && formik.dirty;



  if (resetRequested) {
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
              flex: 1,
              justifyContent: 'space-between',
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

            {/* Success Content */}
            <Box alignItems="center" gap="s">
              <Image
                source={require('@/src/assets/images/mailbox.png')}
                style={{ width: width * 0.9, height: width * 0.9 }}
                resizeMode="contain"
              />

              <Text variant="h7" fontSize={28} textAlign="center" fontWeight="bold">
                Check Your Email
              </Text>

              <Text variant="p5" color="textSecondary" textAlign="center" width={'85%'}>
                We&apos;ve sent password reset instructions to {'\n'}
                <Text variant="p5" color="white" fontWeight="600">
                  {maskEmail(submittedEmail)}
                </Text>
              </Text>
            </Box>

            {/* Action Button */}
            <Box gap="m" mt="xxl">
              <Button
                label="Proceed"
                variant="primary"
                onPress={() => router.push('/(auth)/login')}
                labelColor="black"
                bg="primary700"
              />

              <Box alignItems="center" justifyContent={'center'} flexDirection={'row'}>
                <Text variant="body" color="textSecondary">
                  Didn&apos;t receive the email?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setResetRequested(false);
                    formik.resetForm();
                  }}
                >
                  <Text variant="body" color="primary600" fontWeight="bold">
                    Resend Email
                  </Text>
                </TouchableOpacity>
              </Box>
            </Box>
          </ScrollView>
        </KeyboardAvoidingView>
      </Box>
    );
  }

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
              Password Reset
            </Text>
            <Text variant="p5" color="textSecondary" mt="xs" textAlign="center" width={'70%'}>
              Enter your email, and we&apos;ll send a password reset link.
            </Text>
          </Box>

          {/* Form Section */}
          <Box gap="m">
            <Box>
              <Text variant="h11" mb="s" color="textPrimary">
                Email Address
              </Text>
              <Input
                placeholder="e.g., your@example.com"
                value={formik.values.email}
                onChangeText={formik.handleChange('email')}
                onBlur={formik.handleBlur('email')}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={theme.colors.gray600}
                status={formik.errors.email && formik.touched.email ? 'danger' : 'basic'}
                caption={
                  formik.errors.email && formik.touched.email ? formik.errors.email : undefined
                }
                style={{
                  backgroundColor: '#111',
                  borderColor: theme.colors.gray800,
                }}
              />
            </Box>
          </Box>

          {/* Action Button */}
          <Box mt="xxl">
            <Button
              label="Reset Password"
              variant={isFormValid ? 'primary' : 'disabled'}
              // onPress={formik.handleSubmit}
              onPress={() => router.push('/(auth)/reset-password')}
              disabled={!isFormValid}
              labelColor={isFormValid ? 'black' : 'gray600'}
              bg={isFormValid ? 'primary700' : 'btnDisabled'}
            />
          </Box>
        </ScrollView>

        {/* Footer */}
        <Box
          flexDirection="row"
          justifyContent="center"
          alignItems="center"
          paddingBottom="xl"
          backgroundColor="mainBackground"
        >
          <Text variant="body" color="white">
            Don&apos;t have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text variant="body" color="primary600" fontWeight="bold">
              Create Account
            </Text>
          </TouchableOpacity>
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
};

export default ForgotPassword;
