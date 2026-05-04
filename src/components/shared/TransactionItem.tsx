import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { useTheme } from '@shopify/restyle';
import { Image } from 'expo-image';
import React from 'react';
import Box from './Box';
import Text from './Text';

interface TransactionItemProps {
  tx: {
    id: string;
    from: string;
    amount: string;
    assetCode?: string;
    createdAt?: string;
  };
  gAddress: string | null;
}

const TransactionItem = ({ tx, gAddress }: TransactionItemProps) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  const isSent = tx.from === gAddress;

  const getTokenIcon = (code?: string) => {
    switch (code?.toUpperCase()) {
      case 'ETH':
        return require('@/src/assets/token/eth.png');
      case 'USDT':
        return require('@/src/assets/token/usdt.png');
      default:
        return require('@/src/assets/token/stellar.png');
    }
  };

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor={isDark ? 'gray900' : 'white'}
      padding="m"
      borderRadius={20}
      mb="s"
      style={
        !isDark
          ? {
              borderWidth: 1,
              borderColor: '#F5F5F5',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }
          : {}
      }
    >
      <Box
        width={48}
        height={48}
        borderRadius={24}
        backgroundColor={isDark ? 'black' : 'text400'}
        justifyContent="center"
        alignItems="center"
      >
        <Image
          source={getTokenIcon(tx.assetCode)}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
        />
      </Box>
      <Box flex={1} ml="m">
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {tx.assetCode || 'Stellar'}
        </Text>
        <Text variant="p8" color="textSecondary" fontWeight="600" mt="xs">
          {isSent ? 'Sent' : 'Received'}
        </Text>
      </Box>
      <Box alignItems="flex-end">
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {isSent ? '-' : '+'}${parseFloat(tx.amount).toFixed(2)}
        </Text>
        <Text variant="p8" color="textSecondary" fontWeight="600" mt="xs">
          2hrs ago
        </Text>
      </Box>
    </Box>
  );
};

export default TransactionItem;
