import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';

interface WalletNameCardProps {
  name: string;
}

const WalletNameCard: React.FC<WalletNameCardProps> = ({ name }) => {
  return (
    <Box mb="l">
      <Text variant="p5" fontWeight="700" color="textPrimary" mb="s">
        Wallet Name
      </Text>
      <Box backgroundColor="bg11" borderRadius={12} px="m" py="m">
        <Text variant="p5" color="textPrimary">
          {name}
        </Text>
      </Box>
    </Box>
  );
};

export default WalletNameCard;
