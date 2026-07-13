import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';

const TitleSection: React.FC = () => {
  return (
    <Box alignItems="center" mb="xl" px="m">
      <Text variant="h7" fontSize={32} fontWeight="bold" textAlign="center" color="textPrimary">
        Create Shared Wallet
      </Text>
      <Text variant="p5" color="textSecondary" textAlign="center">
        Name your wallet so members recognize it.
      </Text>
    </Box>
  );
};

export default TitleSection;
