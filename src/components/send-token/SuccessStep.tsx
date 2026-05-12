import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';

interface Props {
  onViewTransaction: () => void;
  onContinue: () => void;
}

const SuccessStep = ({ onViewTransaction, onContinue }: Props) => {
  return (
    <Box flex={1} paddingHorizontal="l" justifyContent="space-between" pb="xl">
      <Box flex={1} justifyContent="center" alignItems="center">
        <Image
          source={require('@/src/assets/images/success.png')}
          style={{ width: 160, height: 160, resizeMode: 'contain', marginBottom: 32 }}
        />
        <Text variant="h7" color="textPrimary" fontWeight="700" mb="xs">
          Token Sent!
        </Text>
        <Box px="m">
          <Text textAlign="center" lineHeight={22}>
            <Text variant="p7" fontFamily={'SFBold'} color="textPrimary">0.000345SOL </Text>
            <Text variant="p6" color="textSecondary">was successfully sent to </Text>
            <Text variant="p6" color="textPrimary" fontFamily={'SFBold'}>Crownz Wallet </Text>
            <Text variant="p6" color="textSecondary">{`{0xE643...e16c}`}</Text>
          </Text>
        </Box>
        <TouchableOpacity style={{ marginTop: 10 }} onPress={onViewTransaction}>
          <Text variant="p7" color="primary" fontWeight="600">View Transaction</Text>
        </TouchableOpacity>
      </Box>
      <TouchableOpacity activeOpacity={0.8} onPress={onContinue}>
        <Box height={56} backgroundColor="primary" borderRadius={28} justifyContent="center" alignItems="center">
          <Text variant="p6" color="black" fontWeight="700">Continue</Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default SuccessStep;
