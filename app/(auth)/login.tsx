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

const loginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const Login = () => {
  const theme = useTheme<Theme>();
  const router = useRouter();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: (values) => {
      console.log('Form values', values);
      // Handle login logic here
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
            <Text variant="title" mt="m" fontSize={32}>
              Sign In
            </Text>
            <Text variant="body" color="textSecondary" mt="xs">
              Welcome back to Latch
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

            <Box>
              <Text variant="h11" mb="s" color="textPrimary">
                Password
              </Text>
              <Input
                placeholder="Enter Password"
                value={formik.values.password}
                onChangeText={formik.handleChange('password')}
                onBlur={formik.handleBlur('password')}
                secureTextEntry
                placeholderTextColor={theme.colors.gray600}
                status={formik.errors.password && formik.touched.password ? 'danger' : 'basic'}
                caption={
                  formik.errors.password && formik.touched.password
                    ? formik.errors.password
                    : undefined
                }
                accessoryRight={() => (
                  <Box pr="s">
                    <Ionicons name="lock-closed-outline" size={20} color={theme.colors.gray500} />
                  </Box>
                )}
                style={{
                  backgroundColor: '#111',
                  borderColor: theme.colors.gray800,
                }}
              />
              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginTop: 12 }}
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text variant="captionSemibold" color="primary600">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </Box>
          </Box>

          {/* Login Button */}
          <Box mt="xxl">
            <Button
              label="Sign In"
              variant={isFormValid ? 'primary' : 'disabled'}
              onPress={formik.handleSubmit}
              disabled={!isFormValid}
              labelColor={isFormValid ? 'black' : 'gray600'}
              bg={isFormValid ? 'primary700' : 'btnDisabled'}
            />
          </Box>

          {/* Divider */}
          <Box flexDirection="row" alignItems="center" my="xl">
            <Box flex={1} height={1} backgroundColor="gray800" />
            <Text variant="caption" color="textSecondary" marginHorizontal="m">
              Or
            </Text>
            <Box flex={1} height={1} backgroundColor="gray800" />
          </Box>

          {/* Social Logins */}
          <Box gap="m">
            <Button
              label="Continue with Apple"
              variant="outline"
              onPress={() => {}}
              leftIcon={<Ionicons name="logo-apple" size={18} color={theme.colors.textPrimary} />}
              labelColor="textPrimary"
              borderColor="gray800"
              bg="transparent"
              style={{ height: 60, borderRadius: 16 }}
            />
            <Button
              label="Continue with Google"
              variant="outline"
              onPress={() => {}}
              leftIcon={
                <Image
                  source={require('@/src/assets/images/googleLogo.png')}
                  style={{ width: 16, height: 16 }}
                  resizeMode="contain"
                />
              }
              labelColor="textPrimary"
              borderColor="gray800"
              bg="transparent"
              style={{ height: 60, borderRadius: 16 }}
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
          <Text variant="body" color="textSecondary">
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

export default Login;
