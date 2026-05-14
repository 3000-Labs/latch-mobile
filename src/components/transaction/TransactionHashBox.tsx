import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface TransactionHashBoxProps {
  hash: string;
  isDark?: boolean;
}

const TransactionHashBox = ({ hash, isDark }: TransactionHashBoxProps) => {
  const handleCopy = () => {
    Clipboard.setStringAsync(hash);
  };

  return (
    <Box mb="xl" px="m">
      <Text variant="h8" color="textPrimary" fontWeight="700" mb="m">
        Transaction Hash
      </Text>
      <TouchableOpacity activeOpacity={0.7} onPress={handleCopy}>
        <Box
          backgroundColor={isDark ? 'bg11' : 'bgDark100'}
          borderRadius={16}
          padding="m"
          borderWidth={1}
          borderColor="gray900"
        >
          <Text variant="p8" color="textSecondary" lineHeight={22}>
            {hash}
          </Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default TransactionHashBox;
