import React from 'react';
import { Image, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';

interface Props {
  name: string;
  duration: string;
  isError?: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

const SessionKeySuccess = ({ name, duration, isError, onClose, onRetry }: Props) => {
  return (
    <Box flex={1} alignItems="center" justifyContent="center" paddingHorizontal="xl">
      <Box mb="xl">
        <Image
          source={
            isError
              ? require('@/src/assets/images/error.png')
              : require('@/src/assets/images/success.png')
          }
          style={{ width: 140, height: 140 }}
          resizeMode="contain"
        />
      </Box>

      <Text variant="h7" color="textPrimary" fontWeight="700" mb="s" textAlign="center">
        {isError ? 'Session Not Created!' : 'Session Created'}
      </Text>

      <Text variant="p5" color="textSecondary" textAlign="center" lineHeight={24}>
        {isError ? (
          <>
            Could not create a session key for{' '}
            <Text color="textPrimary" fontWeight="700">
              {name || 'My Bot'}
            </Text>
            .
          </>
        ) : (
          <>
            The session key for{' '}
            <Text color="textPrimary" fontWeight="700">
              {name || 'My Bot'}
            </Text>{' '}
            is now active. It will automatically expire in {duration.toLowerCase()}.
          </>
        )}
      </Text>

      {/* Footer */}
      <Box position="absolute" bottom={20} left={16} right={16}>
        <TouchableOpacity activeOpacity={0.7} onPress={isError ? onRetry : onClose}>
          <Box
            height={64}
            backgroundColor="primary"
            borderRadius={32}
            justifyContent="center"
            alignItems="center"
          >
            <Text variant="h10" color="black" fontWeight="700">
              {isError ? 'Try Again' : 'View Permissions'}
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default SessionKeySuccess;
