import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import TokenIcon from '@/src/components/shared/TokenIcon';
import { useTokenIcon } from '@/src/hooks/use-token-list';
import React from 'react';

interface TransactionStatusHeaderProps {
  amount: string;
  assetCode: string;
  status: 'Completed' | 'Pending' | 'Failed';
  type: 'sent' | 'received';
  isDark: boolean;
}

const TransactionStatusHeader = ({
  amount,
  assetCode,
  status,
  type,
  isDark,
}: TransactionStatusHeaderProps) => {
  const isReceived = type === 'received';
  const prefix = isReceived ? '+' : '-';
  const iconUrl = useTokenIcon(assetCode);

  const amountNum = parseFloat(amount);
  const formattedAmount = amountNum.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });

  return (
    <Box alignItems="center" mt="xl" mb="xl">
      <Box
        width={80}
        height={80}
        borderRadius={40}
        // backgroundColor={isDark ? 'bg11' : 'bg900'}
        justifyContent="center"
        alignItems="center"
        mb="l"
        // style={{ backgroundColor: '#0A2525' }}
      >
        <TokenIcon iconUrl={iconUrl} size={80} />
      </Box>

      <Text variant="h3" color="textPrimary" fontWeight="700" style={{ fontSize: 36 }}>
        {prefix}
        {formattedAmount} {assetCode}
      </Text>

      <Box
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
      </Box>
    </Box>
  );
};

export default TransactionStatusHeader;
