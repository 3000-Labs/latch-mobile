import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';
import { Image } from 'react-native';

const EmptyState: React.FC = () => {
  return (
    <Box alignItems="center" mt="xs" px="m">
      <Image
        source={require('@/src/assets/images/empty.png')}
        style={{ width: 160, height: 160 }}
        resizeMode="contain"
      />
      <Text variant="h9" fontWeight="bold" color="textPrimary" textAlign="center" mt="l">
        No member yet
      </Text>
      <Text variant="p6" color="textSecondary" textAlign="center" mt="s" px="m">
        No members added yet. Add at least one member to continue.
      </Text>
    </Box>
  );
};

export default EmptyState;
