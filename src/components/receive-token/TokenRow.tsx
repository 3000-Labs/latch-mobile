import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import TokenIcon from '@/src/components/shared/TokenIcon';
import { type TokenBalance } from '@/src/hooks/use-portfolio';
import { useTokenIcon } from '@/src/hooks/use-token-list';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface Props {
  token: TokenBalance;
  onPress: () => void;
}

const TokenRow = ({ token, onPress }: Props) => {
  const iconUrl = useTokenIcon(token.code, token.issuer);
  const amount = parseFloat(token.amount);
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: token.code === 'XLM' ? 7 : 2,
  });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Box
        flexDirection="row"
        alignItems="center"
        backgroundColor="bg11"
        borderRadius={16}
        padding="m"
        mb="s"
        height={82}
      >
        <Box
          width={44}
          height={44}
          borderRadius={12}
          backgroundColor="black"
          justifyContent="center"
          alignItems="center"
          mr="m"
          overflow="hidden"
        >
          <TokenIcon iconUrl={iconUrl} size={44} />
        </Box>
        <Box flex={1}>
          <Text variant="h10" color="textPrimary" fontWeight="700" mb="xs">
            {token.code}
          </Text>
          <Box flexDirection="row" alignItems="center">
            <Text variant="captionSemibold" color="textSecondary" style={{ letterSpacing: 0.5 }}>
              BALANCE{' '}
            </Text>
            <Text variant="captionBold" color="textPrimary" style={{ letterSpacing: 0.5 }}>
              {formatted} {token.code}
            </Text>
          </Box>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default TokenRow;
