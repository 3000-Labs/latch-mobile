import InputField from '@/src/components/create-shared/InputField';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { Formik } from 'formik';
import React from 'react';
import { ScrollView } from 'react-native';
import * as Yup from 'yup';

const schema = Yup.object().shape({
  name: Yup.string().trim().required('Member name is required'),
});

interface ScannedMemberFormProps {
  address: string;
  onAdd: (name: string, address: string) => void;
  onScanAgain: () => void;
}

const truncate = (str: string) =>
  str.length > 20 ? `${str.slice(0, 8)}...${str.slice(-8)}` : str;

const ScannedMemberForm: React.FC<ScannedMemberFormProps> = ({ address, onAdd, onScanAgain }) => {
  return (
    <Box
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1C1C1C',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 20,
      }}
    >
      {/* Handle */}
      <Box alignItems="center" pb="m">
        <Box width={36} height={4} borderRadius={2} backgroundColor="gray800" />
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Box paddingHorizontal="m" pb="xl">
          {/* Scanned address */}
          <Text variant="h10" color="textPrimary" fontWeight="700" mb="s">
            Scanned Address
          </Text>
          <Box
            bg="bg11"
            borderRadius={12}
            paddingHorizontal="m"
            paddingVertical="m"
            mb="l"
            style={{ borderWidth: 1, borderColor: '#2E2E2E' }}
          >
            <Text variant="p7" color="primary" fontWeight="600">
              {truncate(address)}
            </Text>
          </Box>

          {/* Name form */}
          <Formik
            initialValues={{ name: '' }}
            validationSchema={schema}
            onSubmit={(values) => onAdd(values.name.trim(), address)}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <>
                <InputField
                  label="Member Name"
                  placeholder="e.g., Crownz"
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  status={touched.name && errors.name ? 'danger' : 'basic'}
                  error={touched.name && errors.name ? errors.name : undefined}
                  autoCapitalize="words"
                  autoFocus
                />

                <Button
                  label="Add Member"
                  disabled={!values.name}
                  onPress={() => handleSubmit()}
                />

                <Button
                  label="Scan Again"
                  variant="outline"
                  onPress={onScanAgain}
                  mt="s"
                  labelColor="textPrimary"
                />
              </>
            )}
          </Formik>
        </Box>
      </ScrollView>
    </Box>
  );
};

export default ScannedMemberForm;
