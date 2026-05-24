import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';

const TitleSection: React.FC = () => {
  return (
    <Box alignItems="center" mb="xl" px="m">
      <Text variant="h7" fontSize={32} fontWeight="bold" textAlign="center" color="textPrimary">
        Add Wallet Members
      </Text>
      <Text variant="p5" color="textSecondary" textAlign="center" mt="s">
        Add people who can approve transactions
      </Text>
    </Box>
  );
};

export default TitleSection;
