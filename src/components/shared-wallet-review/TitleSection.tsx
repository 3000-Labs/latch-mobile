import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';

const TitleSection: React.FC = () => {
  return (
    <Box mb="l" mt="s">
      <Text variant="h8" fontWeight="700" color="textPrimary" textAlign="center">
        Review Shared Wallet
      </Text>
      <Text variant="p6" color="textSecondary" textAlign="center">
        Check everything before creating.
      </Text>
    </Box>
  );
};

export default TitleSection;
