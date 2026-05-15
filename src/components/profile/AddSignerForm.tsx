import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useFormik } from 'formik';
import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import * as Yup from 'yup';

import Box from '@/src/components/shared/Box';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

interface Props {
  onBack: () => void;
  onSubmit: (values: { name: string; address: string }) => void;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Required'),
  address: Yup.string().required('Required').min(5, 'Too short'),
});

const AddSignerForm = ({ onBack, onSubmit }: Props) => {
  const theme = useTheme<Theme>();

  const formik = useFormik({
    initialValues: { name: '', address: '' },
    validationSchema,
    onSubmit,
  });

  return (
    <Box flex={1}>
      {/* Header */}
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="m"
        py="m"
        mb="m"
      >
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <Text variant="h10" color="textPrimary" fontWeight="700">
          Add Signer
        </Text>

        <Box width={20} />
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Signer Name */}
        <Box mb="l">
          <Text variant="p7" color="textPrimary" fontWeight="700" mb="xs" style={{ marginLeft: 4 }}>
            Signer Name
          </Text>
          <Input
            placeholder="e.g., My iPad"
            value={formik.values.name}
            onChangeText={formik.handleChange('name')}
            onBlur={formik.handleBlur('name')}
            status={formik.errors.name && formik.touched.name ? 'danger' : 'basic'}
          />
        </Box>

        {/* Public Key / Address */}
        <Box mb="l">
          <Text variant="p7" color="textPrimary" fontWeight="700" mb="xs" style={{ marginLeft: 4 }}>
            Public Key / Address
          </Text>
          <Input
            placeholder="G..."
            value={formik.values.address}
            onChangeText={formik.handleChange('address')}
            onBlur={formik.handleBlur('address')}
            status={formik.errors.address && formik.touched.address ? 'danger' : 'basic'}
            rightElement={
              <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="scan-outline" size={22} color={theme.colors.gray500} />
              </TouchableOpacity>
            }
          />
        </Box>

        <Box height={30} />
        <Box padding="m" paddingBottom="l">
          <TouchableOpacity activeOpacity={0.7} onPress={() => formik.handleSubmit()}>
            <Box
              height={64}
              backgroundColor="primary"
              borderRadius={32}
              justifyContent="center"
              alignItems="center"
            >
              <Text variant="h10" color="black" fontWeight="700">
                Add Signer
              </Text>
            </Box>
          </TouchableOpacity>
        </Box>
      </ScrollView>

      {/* Bottom Button */}
    </Box>
  );
};

export default AddSignerForm;
