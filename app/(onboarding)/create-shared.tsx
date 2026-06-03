import { Theme } from '@/src/theme/theme';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Formik } from 'formik';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Yup from 'yup';

import ContinueButton from '@/src/components/create-shared/ContinueButton';
import Header from '@/src/components/create-shared/Header';
import InputField from '@/src/components/create-shared/InputField';
import TitleSection from '@/src/components/create-shared/TitleSection';
import Box from '@/src/components/shared/Box';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';

const SharedWalletSchema = Yup.object().shape({
  walletName: Yup.string().trim().required('Wallet name is required'),
  purpose: Yup.string().trim(),
});

const CreateSharedWallet = () => {
  const theme = useTheme<Theme>();

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleContinue = (values: { walletName: string; purpose: string }) => {
    router.push({
      pathname: '/(onboarding)/add-members',
      params: {
        walletName: values.walletName.trim(),
        purpose: values.purpose.trim(),
      },
    });
  };

  return (
    <Formik
      initialValues={{ walletName: '', purpose: '' }}
      validationSchema={SharedWalletSchema}
      onSubmit={handleContinue}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
        <Box flex={1} backgroundColor="onboardingbg">
          <LinearGradient
            colors={[theme.colors.gradientLight, theme.colors.gradientDark]}
            locations={[0, 0.2772]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
          <StatusBar style="light" />

          {/* Top Header - Back Button & Centered Logo (Notch Safe) */}
          <Header />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Main content scroll/body area */}
              <Box flex={1} px="m" justifyContent="flex-start" mt="xs">
                {/* Large centered title section */}
                <TitleSection />

                {/* Input Form Fields exactly matching design mockup */}
                <Box width="100%" mt="s">
                  <InputField
                    label="Wallet Name"
                    placeholder="e.g., Treasury"
                    value={values.walletName}
                    onChangeText={handleChange('walletName')}
                    onBlur={handleBlur('walletName')}
                    status={touched.walletName && errors.walletName ? 'danger' : 'basic'}
                    error={touched.walletName && errors.walletName ? errors.walletName : undefined}
                    autoFocus
                  />

                  <InputField
                    label="Purpose"
                    isOptional
                    placeholder="What will this wallet be used for?"
                    value={values.purpose}
                    onChangeText={handleChange('purpose')}
                    onBlur={handleBlur('purpose')}
                    status={touched.purpose && errors.purpose ? 'danger' : 'basic'}
                    error={touched.purpose && errors.purpose ? errors.purpose : undefined}
                  />
                </Box>
              </Box>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Bottom Continue Button (Safe Area Aware) */}
          <Box
            px="m"
            style={{
              paddingBottom: Math.max(insets.bottom, 20),
              paddingTop: 12,
            }}
          >
            <ContinueButton disabled={!values.walletName} onPress={() => handleSubmit()} />
          </Box>
        </Box>
      )}
    </Formik>
  );
};

export default CreateSharedWallet;
