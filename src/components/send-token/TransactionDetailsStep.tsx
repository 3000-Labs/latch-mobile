import React from 'react';
import { TouchableOpacity } from 'react-native';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';

interface Props {
  onClose: () => void;
}

const TransactionDetailsStep = ({ onClose }: Props) => {
  return (
    <Box flex={1} paddingHorizontal="l" justifyContent="space-between" pb="xl">
      <Box mt="xxl">
        <Text variant="p8" color="textSecondary" textAlign="center" mb="s">Amount Sent</Text>
        <Text variant="h5" color="textPrimary" textAlign="center" fontWeight="700">0.000345SOL</Text>

        <Box mt="xxl" gap="l">
          <Box flexDirection="row" justifyContent="space-between">
            <Text variant="p7" color="textSecondary">Wallet Address</Text>
            <Box flex={1} alignItems="flex-end">
              <Text variant="p7" color="textPrimary" textAlign="right" fontWeight="600">
                Crownz Wallet {`{0xE643...e16c}`}
              </Text>
            </Box>
          </Box>

          <Box flexDirection="row" justifyContent="space-between">
            <Text variant="p7" color="textSecondary">Transaction Hash</Text>
            <Box flex={1} alignItems="flex-end" ml="m">
              <Text variant="p7" color="textPrimary" textAlign="right" fontWeight="600">
                7a8f9e2c3d4b5a6c7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d
              </Text>
            </Box>
          </Box>

          <Box flexDirection="row" justifyContent="space-between">
            <Text variant="p7" color="textSecondary">Status</Text>
            <Text variant="p7" color="primary" fontWeight="700">Confirmed</Text>
          </Box>

          <Box flexDirection="row" justifyContent="space-between">
            <Text variant="p7" color="textSecondary">Date</Text>
            <Text variant="p7" color="textPrimary" fontWeight="600">May 5th, 2026 14:24:34</Text>
          </Box>
        </Box>
      </Box>

      <TouchableOpacity activeOpacity={0.8} onPress={onClose}>
        <Box height={56} backgroundColor="primary" borderRadius={28} justifyContent="center" alignItems="center">
          <Text variant="p6" color="black" fontWeight="700">Close</Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default TransactionDetailsStep;
