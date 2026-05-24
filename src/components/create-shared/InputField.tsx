import React from 'react';
import { TextInputProps } from 'react-native';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import Input from '@/src/components/shared/Input';

interface InputFieldProps extends TextInputProps {
  label: string;
  isOptional?: boolean;
  status?: 'danger' | 'basic';
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  isOptional = false,
  status = 'basic',
  error,
  ...props
}) => {
  return (
    <Box width="100%" mb="l">
      {/* Labeled Input Section */}
      <Box flexDirection="row" alignItems="center" mb="s" gap="xs">
        <Text variant="h10" color="textPrimary" fontWeight="bold" fontSize={16}>
          {label}
        </Text>
        {isOptional && (
          <Text variant="p7" color="textSecondary" fontSize={16}>
            (optional)
          </Text>
        )}
      </Box>

      {/* Styled Input Field wrapper */}
      <Input status={status} {...props} />
      {error && (
        <Text variant="h12" color="inputError" mt="xs">
          {error}
        </Text>
      )}
    </Box>
  );
};

export default InputField;
