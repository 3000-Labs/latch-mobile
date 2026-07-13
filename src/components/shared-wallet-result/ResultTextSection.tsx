import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';

interface ResultTextSectionProps {
  success: boolean;
  errorMessage?: string;
}

const ResultTextSection: React.FC<ResultTextSectionProps> = ({ success, errorMessage }) => {
  return (
    <Box mb="l" px="s">
      <Text variant="h8" fontWeight="700" color="textPrimary" textAlign="center" mb="xs">
        {success ? 'Multisig Wallet Created' : 'Multisig Wallet Wasn’t Created'}
      </Text>
      <Text variant="p6" color="textSecondary" textAlign="center">
        {success
          ? 'Your multisig wallet is ready to receive funds.'
          : errorMessage || 'Your multisig wallet failed to create.'}
      </Text>
    </Box>
  );
};

export default ResultTextSection;
