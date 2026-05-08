import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { NUMERIC_KEYS, SYMBOL_KEYS, Wallet } from './types';

interface Props {
  selectedWallet: Wallet;
  amount: string;
  isSymbolMode: boolean;
  onKeyPress: (key: string) => void;
}

const AmountEntryStep = ({ selectedWallet, amount, isSymbolMode, onKeyPress }: Props) => {
  const theme = useTheme<Theme>();

  const KeypadButton = ({ num, sub, onPress }: { num: string; sub?: string; onPress: () => void }) => (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      style={{
        flex: 1,
        height: 60,
        backgroundColor: '#48484A',
        margin: 4,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text variant="h8" color="white" fontWeight="400">
        {num}
      </Text>
      {sub ? (
        <Text variant="p8" style={{ color: '#EBEBF599', fontSize: 10, marginTop: -2 }}>
          {sub}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  const keypadData = isSymbolMode ? SYMBOL_KEYS : NUMERIC_KEYS;
  const rows = keypadData.reduce((acc: any[][], val, i) => {
    if (i % 3 === 0) acc.push([]);
    acc[acc.length - 1].push(val);
    return acc;
  }, []);

  return (
    <Box flex={1}>
      <Box paddingHorizontal="l" mb="m">
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          pb="s"
          style={{ borderBottomWidth: 1, borderBottomColor: '#333' }}
        >
          <Box flexDirection="row" alignItems="center" flex={1}>
            <Text variant="p7" color="textSecondary">To: </Text>
            <Text variant="p7" color="textPrimary" fontWeight="700">
              {selectedWallet.name}{' '}
            </Text>
            <Text variant="p7" color="textSecondary" style={{ fontSize: 13 }}>{`{${selectedWallet.address}}`}</Text>
          </Box>
          <TouchableOpacity>
            <Ionicons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </Box>
      </Box>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <Box alignItems="center" mt="xxl" mb="xl">
          <Box flexDirection="row" alignItems="center">
            <Text variant={'h3'} color={amount !== '0' ? 'textPrimary' : 'textSecondary'}>
              {amount}
            </Text>
            <Box width={3} height={50} backgroundColor="primary700" marginHorizontal="s" />
            <Text variant={'h3'} style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
              ETH
            </Text>
          </Box>
          <TouchableOpacity style={{ position: 'absolute', right: 40, top: 20 }}>
            <Box
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="bg800"
              justifyContent="center"
              alignItems="center"
            >
              <Ionicons name="swap-vertical" size={16} color={theme.colors.textSecondary} />
            </Box>
          </TouchableOpacity>
          <Text variant="p6" color="textSecondary" mt="s">
            $0.00
          </Text>
        </Box>
      </ScrollView>

      <Box backgroundColor="black" paddingHorizontal="xs" paddingBottom="m" style={{ paddingTop: 8 }}>
        <Box flexDirection="row" justifyContent="center" gap="m" mb="m" paddingHorizontal="l">
          {['$50', '$500', '$1000'].map((btn) => (
            <TouchableOpacity key={btn} style={{ flex: 1 }}>
              <Box height={54} backgroundColor="bg900" borderRadius={12} justifyContent="center" alignItems="center">
                <Text variant="p6" color="textPrimary" fontWeight="700">{btn}</Text>
              </Box>
            </TouchableOpacity>
          ))}
        </Box>
        <Box paddingHorizontal="l" mb="m">
          <Box height={1} bg={'btnDisabled'} mb={'m'} />
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" backgroundColor="transparent">
            <Box>
              <Text variant="p8" color="textSecondary" mb="xs">Available To Send</Text>
              <Text variant="h11" color="textPrimary" fontWeight="700">0.000474746674747472 SOL</Text>
            </Box>
            <TouchableOpacity>
              <Box px="m" py="s" backgroundColor="bg900" borderRadius={8}>
                <Text variant="p8" color="textPrimary" fontWeight="700">Max</Text>
              </Box>
            </TouchableOpacity>
          </Box>
        </Box>

        {rows.map((row, rowIndex) => (
          <Box key={rowIndex} flexDirection="row">
            {row.map((item: any, i) => (
              <KeypadButton
                key={i}
                num={typeof item === 'string' ? item : item.num}
                sub={typeof item === 'string' ? undefined : item.sub}
                onPress={() => onKeyPress(typeof item === 'string' ? item : item.num)}
              />
            ))}
          </Box>
        ))}
        <Box flexDirection="row">
          <Box flex={1} />
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
