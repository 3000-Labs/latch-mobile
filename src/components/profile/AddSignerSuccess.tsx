import React from 'react';
import { Image, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';

interface Props {
  signerName: string;
  onContinue: () => void;
}

const AddSignerSuccess = ({ signerName, onContinue }: Props) => {
  return (
    <Box flex={1} paddingHorizontal="l" alignItems="center">
      <Box flex={1} />
      <Box flex={2} alignItems="center">
        <Box mb="xl">
          <Image
            source={require('@/src/assets/images/success.png')}
            style={{ width: 180, height: 180 }}
            resizeMode="contain"
          />
        </Box>

        <Text variant="h7" color="textPrimary" fontWeight="700">
          Signer Added!
        </Text>

        <Text variant="p5" color="textSecondary" textAlign="center" mb="xl">
          <Text variant="p5" color="textPrimary" fontWeight="700">
            {signerName}
          </Text>{' '}
          was successfully added as a signer.
        </Text>
      </Box>

      <Box width="100%" position="absolute" bottom={100}>
        <TouchableOpacity activeOpacity={0.7} onPress={onContinue}>
          <Box
            height={64}
            backgroundColor="primary"
            borderRadius={32}
            justifyContent="center"
            alignItems="center"
          >
            <Text variant="h10" color="black" fontWeight="700">
              Continue
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default AddSignerSuccess;
