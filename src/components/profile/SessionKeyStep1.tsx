import React from 'react';
import { TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import { useAppTheme } from '@/src/theme/ThemeContext';

interface Props {
  values: { name: string };
  errors: { name?: string };
  touched: { name?: boolean };
  setFieldValue: (field: string, value: any) => void;
  onNext: () => void;
}

const SessionKeyStep1 = ({ values, errors, touched, setFieldValue, onNext }: Props) => {
  const { isDark } = useAppTheme();
  const isEnabled = values.name.trim().length > 0;

  return (
    <Box flex={1} paddingHorizontal="m" paddingTop="m">
      {/* Info Box */}
      <Box backgroundColor="bg11" borderRadius={16} padding="l" mb="xl">
        <Text variant="h11" color="textPrimary" fontWeight="700" mb="s">
          What is a Session Key?
        </Text>
        <Text variant="p7" color="textSecondary" lineHeight={22}>
          Instead of giving an app full control, you create a temporary key that can only do exactly
          what you allow it to do. It automatically expires.
        </Text>
      </Box>

      {/* Input Section */}
      <Text variant="h11" color="textPrimary" fontWeight="700" mb="s" style={{ marginLeft: 4 }}>
        Session Name
      </Text>
      <Input
        placeholder="e.g., My trading bot"
        value={values.name}
        onChangeText={(text) => setFieldValue('name', text)}
      />
      {touched.name && errors.name && (
        <Text color="inputError" variant="p7" mt="xs" style={{ marginLeft: 4 }}>
          {errors.name}
        </Text>
      )}

      {/* Footer */}
      <Box position="absolute" bottom={20} left={16} right={16}>
        <TouchableOpacity activeOpacity={0.7} onPress={onNext} disabled={!isEnabled}>
          <Box
            height={64}
            backgroundColor={isEnabled ? 'primary' : 'btnDisabled'}
            borderRadius={32}
            justifyContent="center"
            alignItems="center"
          >
            <Text variant="h10" color={isEnabled ? 'black' : 'textSecondary'} fontWeight="700">
              Continue
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default SessionKeyStep1;
