import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';
import { Image } from 'react-native';

interface TransactionStatusHeaderProps {
  amount: string;
  assetCode: string;
  status: 'Completed' | 'Pending' | 'Failed';
  type: 'sent' | 'received';
  isDark: boolean;
}

const TransactionStatusHeaderMultisig = ({
  amount,
  assetCode,
  status,
  type,
  isDark,
}: TransactionStatusHeaderProps) => {
  return (
    <Box alignItems="center" mt="xl" mb="xl">
      <Box
        width={180}
        height={156}
        justifyContent="center"
        alignItems="center"
        mb="l"
        // style={{ backgroundColor: '#0A2525' }}
      >
        <Image
          source={require('@/src/assets/images/success.png')}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        />
      </Box>

      <Text variant="h7" color="textPrimary" fontWeight="700">
        Transaction Completed
      </Text>
      <Text
        variant="p5"
        color="textSecondary"
        mt="xs"
        textAlign="center"
        lineHeight={21}
        style={{ maxWidth: '85%' }}
      >
        The transaction has been approved and executed successfully.
      </Text>

      {/* <Box
        backgroundColor="bgDark900"
        px="m"
        py="xs"
        borderRadius={12}
        mt="s"
        style={{ backgroundColor: 'rgba(0, 128, 0, 0.15)' }}
      >
        <Text variant="p8" color="success700" fontWeight="700">
          {status}
        </Text>
      </Box> */}
    </Box>
  );
};

export default TransactionStatusHeaderMultisig;
