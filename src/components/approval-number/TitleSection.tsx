import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';

const TitleSection: React.FC = () => {
  return (
    <Box mb="l">
      <Text variant="h8" fontWeight="700" color="textPrimary" textAlign={'center'}>
        How many approvals are required?
      </Text>
      <Text variant="p6" color="textSecondary" textAlign={'center'}>
        Enter the exact number required.
      </Text>
    </Box>
  );
};

export default TitleSection;
