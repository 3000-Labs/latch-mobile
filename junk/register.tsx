import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFormik } from 'formik';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Yup from 'yup';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Input from '@/src/components/shared/Input';
import LoadingBlur from '@/src/components/shared/LoadingBlur';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const { width } = Dimensions.get('window');

const registerSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const Register = () => {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const router = useRouter();

  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
  const [isAppPickerVisible, setAppPickerVisible] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: registerSchema,
    onSubmit: (values) => {
      console.log('Form values', values);
      // Simulate success
      setSuccessModalVisible(true);
    },
  });

  const isFormValid = formik.isValid && formik.dirty;

  const handleOpenEmailApp = (app: string) => {
    setAppPickerVisible(false);
    // Logic to open specific apps could go here, for now we just open mailto:
    Linking.openURL('mailto:');
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style={statusBarStyle} />
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
            <Text variant="h7" mt="m" fontSize={32}>
              Create Your Account
            </Text>
            <Text variant="p5" color="textSecondary" mt="xs">
              Join and start managing your digital assets
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
                  backgroundColor: statusBarStyle !== 'dark' ? '#111' : '#fff',
                  borderColor: statusBarStyle === 'dark' ? '#E9E9E9' : theme.colors.gray800,
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
                  backgroundColor: statusBarStyle !== 'dark' ? '#111' : '#fff',
                  borderColor: statusBarStyle === 'dark' ? '#E9E9E9' : theme.colors.gray800,
                }}
              />
            </Box>
          </Box>

          {/* Continue Button */}
          <Box mt="xxl">
            <Button
              label="Continue"
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
              onPress={() => router.push('/(auth)/thank-you')}
              leftIcon={<Ionicons name="logo-apple" size={18} color={theme.colors.textPrimary} />}
              labelColor="textPrimary"
              borderColor={statusBarStyle === 'dark' ? 'textDark800' : 'gray800'}
              bg="transparent"
              style={{ height: 60, borderRadius: 16 }}
            />
            <Button
              label="Continue with Google"
              variant="outline"
              onPress={() => router.push('/(auth)/biometric')}
              leftIcon={
                <Image
                  source={require('@/src/assets/images/googleLogo.png')}
                  style={{ width: 16, height: 16 }}
                  resizeMode="contain"
                />
              }
              labelColor="textPrimary"
              borderColor={statusBarStyle === 'dark' ? 'textDark800' : 'gray800'}
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
            Already have an account?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => {
              // router.push('/(auth)/login')
            }}
          >
            <Text variant="body" color="primary600" fontWeight="bold">
              Sign In
            </Text>
          </TouchableOpacity>
        </Box>
      </KeyboardAvoidingView>
      <LoadingBlur visible={false} text="Loading..." />

      {/* Account Created Modal */}
      <Modal visible={isSuccessModalVisible} transparent animationType="fade">
        <Box
          flex={1}
          backgroundColor="black"
          opacity={0.6}
          position="absolute"
          width="100%"
          height="100%"
        />
        <Box
          flex={1}
          justifyContent="center"
          alignItems="center"
          width={340}
          style={{ marginHorizontal: 'auto' }}
        >
          <Box
            backgroundColor="gray900"
            borderRadius={24}
            width="100%"
            px="l"
            pt={'l'}
            alignItems="center"
          >
            <Text variant="h8" textAlign="center" mb="s">
              Account Created
            </Text>
            <Text variant="p7" textAlign="center" color="textSecondary" mb="xl">
              Please check your inbox and click the verification link to complete your account
              setup.
            </Text>

            <Box
              flexDirection="row"
              borderTopWidth={1}
              borderTopColor="gray800"
              width={width * 0.8}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  alignItems: 'center',
                  borderRightWidth: 1,
                  borderRightColor: theme.colors.gray800,
                }}
                onPress={() => setSuccessModalVisible(false)}
              >
                <Text variant="body" color="textSecondary">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 16, alignItems: 'center' }}
                onPress={() => {
                  setSuccessModalVisible(false);
                  setAppPickerVisible(true);
                }}
              >
                <Text variant="body" color="primary600" fontWeight="bold">
                  Verify Email
                </Text>
              </TouchableOpacity>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* Email App Picker Modal */}
      <Modal visible={isAppPickerVisible} transparent animationType="slide">
        <Box
          flex={1}
          style={{ zIndex: 9999 }}
          backgroundColor="black"
          opacity={0.6}
          position="absolute"
          width="100%"
          height="100%"
        />
        <Box flex={1} justifyContent="flex-end" style={{ zIndex: 9999 }}>
          <Box
            backgroundColor="gray900"
            borderTopLeftRadius={24}
            borderTopRightRadius={24}
            padding="xl"
          >
            <Text variant="h11" textAlign="center" mb="xl" color="textSecondary">
              Choose email app
            </Text>

            {['Mail', 'Gmail', 'Outlook'].map((app, index) => (
              <TouchableOpacity
                key={app}
                onPress={() => handleOpenEmailApp(app)}
                style={{
                  paddingVertical: 16,
                  borderTopWidth: index === 0 ? 1 : 0,
                  borderBottomWidth: 1,
                  borderColor: theme.colors.gray800,
                  alignItems: 'center',
                }}
              >
                <Text variant="body" color="primary600">
                  {app}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setAppPickerVisible(false)}
              style={{
                marginTop: 20,
                backgroundColor: theme.colors.gray800,
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: 'center',
              }}
            >
              <Text variant="body" fontWeight="bold">
                Cancel
              </Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default Register;
