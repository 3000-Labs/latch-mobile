import { useAppTheme } from '@/src/theme/ThemeContext';
import { Image } from 'expo-image';
import React from 'react';
import Box from './Box';
import Text from './Text';

interface TransactionItemProps {
  tx: {
    id: string;
    type?: string;
    from: string;
    amount: string;
    assetCode?: string;
    createdAt?: string;
  };
  walletAddress: string | null;
}

const TOKEN_ICONS: Record<string, ReturnType<typeof require>> = {
  ETH: require('@/src/assets/token/eth.png'),
  USDT: require('@/src/assets/token/usdt.png'),
};
const DEFAULT_TOKEN_ICON = require('@/src/assets/token/stellar.png');

const getTokenIcon = (code?: string) => TOKEN_ICONS[code?.toUpperCase() ?? ''] ?? DEFAULT_TOKEN_ICON;

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTokenAmount(amount: string, assetCode?: string): string {
  const num = parseFloat(amount);
  const code = assetCode || 'XLM';
  // Trim trailing zeros but keep at least 2 decimal places
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
  return `${formatted} ${code}`;
}

const TransactionItem = ({ tx, walletAddress }: TransactionItemProps) => {
  const { isDark } = useAppTheme();

  const isSoroban = tx.type === 'invoke_host_function';
  const isSent = !isSoroban && tx.from === walletAddress;

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
          {tx.assetCode || 'XLM'}
        </Text>
        <Text variant="p8" color="textSecondary" fontWeight="600" mt="xs">
          {isSoroban ? 'Contract Call' : isSent ? 'Sent' : 'Received'}
        </Text>
      </Box>
      <Box alignItems="flex-end">
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {isSoroban ? '—' : `${isSent ? '-' : '+'}${formatTokenAmount(tx.amount, tx.assetCode)}`}
        </Text>
        <Text variant="p8" color="textSecondary" fontWeight="600" mt="xs">
          {formatRelativeTime(tx.createdAt)}
        </Text>
      </Box>
    </Box>
  );
};

export default TransactionItem;
