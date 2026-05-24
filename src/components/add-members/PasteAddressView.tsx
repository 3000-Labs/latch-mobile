import InputField from '@/src/components/create-shared/InputField';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Formik } from 'formik';
import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import * as Yup from 'yup';

const schema = Yup.object().shape({
  name: Yup.string().trim().required('Member name is required'),
  address: Yup.string()
    .trim()
    .required('Wallet address is required')
    .matches(/^G[A-Z2-7]{55}$/, 'Enter a valid Stellar wallet address'),
});

interface PasteAddressViewProps {
  onClose: () => void;
  onAdd: (name: string, address: string) => void;
}

const PasteAddressView: React.FC<PasteAddressViewProps> = ({ onClose, onAdd }) => {
  const theme = useTheme<Theme>();

  return (
    <Formik
      initialValues={{ name: '', address: '' }}
      validationSchema={schema}
      onSubmit={(values) => onAdd(values.name.trim(), values.address.trim())}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Header */}
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal="m"
            pt="l"
            pb="m"
          >
            <Text variant="h8" color="textPrimary" fontWeight="700">
              Add Member Details
            </Text>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.btnDisabled,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </Box>

          {/* Form fields */}
          <Box paddingHorizontal="m">
            <InputField
              label="Member Name"
              placeholder="e.g., Crownz"
              value={values.name}
              onChangeText={handleChange('name')}
              onBlur={handleBlur('name')}
              status={touched.name && errors.name ? 'danger' : 'basic'}
              error={touched.name && errors.name ? errors.name : undefined}
              autoCapitalize="words"
            />

            <InputField
              label="Wallet Address"
              placeholder="G..."
              value={values.address}
              onChangeText={handleChange('address')}
              onBlur={handleBlur('address')}
              status={touched.address && errors.address ? 'danger' : 'basic'}
              error={touched.address && errors.address ? errors.address : undefined}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Button
              label="Add"
              disabled={!values.name || !values.address}
              onPress={() => handleSubmit()}
            />
          </Box>
        </ScrollView>
      )}
    </Formik>
  );
};

export default PasteAddressView;
