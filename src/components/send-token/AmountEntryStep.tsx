import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NUMERIC_KEYS, Recipient, SendToken } from './types';

interface Props {
  selectedToken: SendToken;
  selectedWallet: Recipient;
  amount: string;
  onKeyPress: (key: string) => void;
  onMaxPress: () => void;
}

const AmountEntryStep = ({ selectedToken, selectedWallet, amount, onKeyPress, onMaxPress }: Props) => {
  const theme = useTheme<Theme>();

  const shortAddress = `${selectedWallet.address.slice(0, 6)}...${selectedWallet.address.slice(-4)}`;
  const availableAmount = parseFloat(selectedToken.amount);
  const enteredAmount = parseFloat(amount) || 0;
  const isOverBalance = enteredAmount > availableAmount;

  const rows = NUMERIC_KEYS.reduce((acc: { num: string }[][], val, i) => {
    if (i % 3 === 0) acc.push([]);
    acc[acc.length - 1].push(val);
    return acc;
  }, []);

  const KeypadButton = ({ num, onPress }: { num: string; onPress: () => void }) => (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      style={{
        flex: 1,
        height: 60,
        backgroundColor: theme.colors.bg800,
        margin: 4,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text variant="h8" color="white" fontWeight="400">
        {num}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Box flex={1}>
      <Box paddingHorizontal="l" mb="m">
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          pb="s"
          style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.gray800 }}
        >
          <Box flexDirection="row" alignItems="center" flex={1}>
            <Text variant="p7" color="textSecondary">To: </Text>
            <Text variant="p7" color="textPrimary" fontWeight="700">
              {shortAddress}
            </Text>
          </Box>
        </Box>
      </Box>

      <Box flex={1} justifyContent="center" alignItems="center" mb="m">
        <Box flexDirection="row" alignItems="center">
          <Text
            variant="h3"
            color={isOverBalance ? 'inputError' : amount !== '0' ? 'textPrimary' : 'textSecondary'}
          >
            {amount}
          </Text>
          <Box width={3} height={50} backgroundColor="primary700" marginHorizontal="s" />
          <Text variant="h3" style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
            {selectedToken.code}
          </Text>
        </Box>
        {isOverBalance && (
          <Text variant="p8" color="inputError" mt="s">
            Exceeds available balance
          </Text>
        )}
      </Box>

      <Box backgroundColor="mainBackground" paddingHorizontal="xs" paddingBottom="m" style={{ paddingTop: 8 }}>
        <Box paddingHorizontal="l" mb="m">
          <Box height={1} backgroundColor="btnDisabled" mb="m" />
          <Box flexDirection="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Text variant="p8" color="textSecondary" mb="xs">Available to Send</Text>
              <Text variant="h11" color="textPrimary" fontWeight="700">
                {availableAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: selectedToken.code === 'XLM' ? 7 : 2,
                })} {selectedToken.code}
              </Text>
            </Box>
            <TouchableOpacity onPress={onMaxPress}>
              <Box px="m" py="s" backgroundColor="bg900" borderRadius={8}>
                <Text variant="p8" color="textPrimary" fontWeight="700">Max</Text>
              </Box>
            </TouchableOpacity>
          </Box>
        </Box>

        {rows.map((row, rowIndex) => (
          <Box key={rowIndex} flexDirection="row">
            {row.map((item, i) => (
              <KeypadButton
                key={i}
                num={item.num}
                onPress={() => onKeyPress(item.num)}
              />
            ))}
          </Box>
        ))}
        <Box flexDirection="row">
          <KeypadButton num="." onPress={() => onKeyPress('.')} />
          <KeypadButton num="0" onPress={() => onKeyPress('0')} />
          <TouchableOpacity
            onPress={() => onKeyPress('backspace')}
            style={{ flex: 1, height: 60, margin: 4, justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="backspace-outline" size={24} color="white" />
          </TouchableOpacity>
        </Box>
      </Box>
    </Box>
  );
};

export default AmountEntryStep;
