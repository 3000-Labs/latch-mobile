import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';
import { Image, TouchableOpacity } from 'react-native';

interface Props {
  amount: string;
  tokenCode: string;
  recipient: string;
  txHash?: string;
  onContinue: () => void;
}

const SuccessStep = ({ amount, tokenCode, recipient, onContinue }: Props) => {
  const shortRecipient = `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;

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
            <Text variant="p7" fontFamily="SFBold" color="textPrimary">{amount} {tokenCode} </Text>
            <Text variant="p6" color="textSecondary">was successfully sent to </Text>
            <Text variant="p6" color="textPrimary" fontFamily="SFBold">{shortRecipient}</Text>
          </Text>
        </Box>
      </Box>
      <TouchableOpacity activeOpacity={0.8} onPress={onContinue}>
        <Box
          height={56}
          backgroundColor="primary"
          borderRadius={28}
          justifyContent="center"
          alignItems="center"
        >
          <Text variant="p6" color="black" fontWeight="700">Done</Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default SuccessStep;
