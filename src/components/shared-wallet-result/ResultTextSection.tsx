import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';

interface ResultTextSectionProps {
  success: boolean;
}

const ResultTextSection: React.FC<ResultTextSectionProps> = ({ success }) => {
  return (
    <Box mb="l" px="s">
      <Text variant="h8" fontWeight="700" color="textPrimary" textAlign="center" mb="xs">
        {success ? 'Shared Wallet Created' : "Shared Wallet Wasn’t Created"}
      </Text>
      <Text variant="p6" color="textSecondary" textAlign="center">
        {success
          ? 'Your shared wallet is ready to receive funds.'
          : 'Your shared wallet failed to create.'}
      </Text>
    </Box>
  );
};

export default ResultTextSection;
