import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Formik } from 'formik';
import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import * as Yup from 'yup';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const Schema = Yup.object().shape({
  address: Yup.string()
    .trim()
    .required('Multisig wallet address is required')
    .matches(/^C[A-Z2-7]{55}$/, 'Enter a valid wallet address (starts with C)'),
  name: Yup.string().max(40, 'Name is too long'),
});

interface Props {
  onBack: () => void;
  onSubmit: (address: string, name: string) => void;
  isSubmitting: boolean;
}

const AddSharedWalletForm = ({ onBack, onSubmit, isSubmitting }: Props) => {
  const theme = useTheme<Theme>();

  return (
    <Box flex={1} paddingHorizontal="m" paddingBottom="xl">
      {/* Header */}
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" py="xs" mb="m">
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="h7" color="textPrimary" fontWeight="800">
          Add Multisig Wallet
        </Text>
        <Box width={40} />
      </Box>

      <Formik
        initialValues={{ address: '', name: '' }}
        validationSchema={Schema}
        onSubmit={(values) => onSubmit(values.address.trim(), values.name.trim())}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
          <Box flex={1} justifyContent="space-between">
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <Text variant="p7" color="textSecondary" mb="l" lineHeight={22}>
                Add a multisig wallet you&apos;re already a signer on. We verify on-chain that this
                device is a signer, then it appears in your account list so you can view it and
                co-sign transfers.
              </Text>

              <Box mb="l">
                <Text variant="h10" color="textPrimary" mb="s" fontWeight="700">
                  Wallet Address
                </Text>
                <Input
                  value={values.address}
                  onChangeText={handleChange('address')}
                  onBlur={handleBlur('address')}
                  placeholder="C..."
                  autoCapitalize="characters"
                  autoCorrect={false}
                  status={touched.address && errors.address ? 'danger' : 'basic'}
                />
                {touched.address && errors.address && (
                  <Text variant="h12" color="inputError" mt="xs">
                    {errors.address}
                  </Text>
                )}
              </Box>

              <Box mb="l">
                <Text variant="h10" color="textPrimary" mb="s" fontWeight="700">
                  Name (optional)
                </Text>
                <Input
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  placeholder="Multisig Wallet"
                  status={touched.name && errors.name ? 'danger' : 'basic'}
                />
                {touched.name && errors.name && (
                  <Text variant="h12" color="inputError" mt="xs">
                    {errors.name}
                  </Text>
                )}
              </Box>

              <Box backgroundColor="bg11" borderRadius={14} p="m" mb="l" flexDirection="row">
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={theme.colors.textSecondary}
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text variant="p8" color="textSecondary" style={{ flex: 1 }} lineHeight={18}>
                  This is a multisig wallet — you don&apos;t solely control it. Transfers need
                  approvals from enough members to meet its threshold.
                </Text>
              </Box>
            </ScrollView>

            <Box>
              <Button
                label="Add Wallet"
                variant="primary"
                onPress={() => handleSubmit()}
                loading={isSubmitting}
              />
            </Box>
          </Box>
        )}
      </Formik>
    </Box>
  );
};

export default AddSharedWalletForm;
