import React from 'react';
import { TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';

interface Props {
  signerName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const RemoveSignerPrompt = ({ signerName, onCancel, onConfirm }: Props) => {
  return (
    <Box paddingVertical="l" alignItems="center" justifyContent="center" flex={1}>
      <Box
        borderRadius={32}
        paddingVertical="xl"
        px={'m'}
        width="100%"
        alignItems="center"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        <Text variant="h7" color="textPrimary" fontWeight="700" mb="xs">
          Remove Signer
        </Text>

        <Text
          variant="p5"
          color="textSecondary"
          textAlign="center"
          mb="m"
          lineHeight={24}
          width={'70%'}
        >
          Are you sure you want to remove{' '}
          <Text variant="p7" color="textPrimary" fontWeight="700">
            {signerName}
          </Text>{' '}
          as a signer?
        </Text>

        <Box flexDirection="row" width="100%" justifyContent="space-between">
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.7}
            style={{ flex: 1, marginRight: 8 }}
          >
            <Box
              height={56}
              backgroundColor="transparent"
              borderRadius={28}
              borderWidth={1}
              borderColor="gray800"
              justifyContent="center"
              alignItems="center"
            >
              <Text variant="h11" color="textPrimary" fontWeight="700">
                No, Cancel
              </Text>
            </Box>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onConfirm}
            activeOpacity={0.7}
            style={{ flex: 1, marginLeft: 8, width: '100%' }}
          >
            <Box
              height={56}
              backgroundColor="inputError"
              borderRadius={28}
              justifyContent="center"
              alignItems="center"
            >
              <Text variant="h11" color="black" fontWeight="700">
                Yes, Go Ahead
              </Text>
            </Box>
          </TouchableOpacity>
        </Box>
      </Box>
    </Box>
  );
};

export default RemoveSignerPrompt;
