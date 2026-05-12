import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

interface SwapCardProps {
  tokenName: string;
  tokenSubtitle: string;
  tokenIcon: ImageSourcePropType;
  amount: string;
  value: string;
  walletName: string;
  walletBalance: string;
  walletValue?: string;
  showAddFunds?: boolean;
  showWalletDropdown?: boolean;
  onAmountChange?: (text: string) => void;
  onTokenSelect?: () => void;
  onWalletSelect?: () => void;
  onAddFunds?: () => void;
}

const SwapCard: React.FC<SwapCardProps> = ({
  tokenName,
  tokenSubtitle,
  tokenIcon,
  amount,
  value,
  walletName,
  walletBalance,
  walletValue,
  showAddFunds = false,
  showWalletDropdown = false,
  onAmountChange,
  onTokenSelect,
  onWalletSelect,
  onAddFunds,
}) => {
  const theme = useTheme<Theme>();
  const [isFocused, setIsFocused] = React.useState(false);

  const formatDisplayAmount = (value: string) => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Box backgroundColor="cardBackground" borderRadius={18} padding="m">
      <Box flexDirection="row" alignItems="center" marginBottom="m">
        <TouchableOpacity onPress={onTokenSelect} activeOpacity={0.7} style={styles.tokenSection}>
          <Image source={tokenIcon} style={styles.tokenIcon} />
          <Box>
            <Box flexDirection="row" alignItems="center">
              <Text variant="h10" color="textPrimary" style={styles.tokenName}>
                {tokenName}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textPrimary} />
            </Box>
            <Text variant="p8" color="textSecondary">
              {tokenSubtitle}
            </Text>
          </Box>
        </TouchableOpacity>

        <Box flex={1} alignItems="flex-end">
          <TextInput
            style={styles.amountInput}
            value={isFocused ? amount : formatDisplayAmount(amount)}
            onChangeText={onAmountChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textPrimary}
            keyboardType="decimal-pad"
          />

          <Text variant="p8" color="textSecondary">
            {value}
          </Text>
        </Box>
      </Box>

      <Box height={1} backgroundColor="bg800" marginBottom="m" />

      <Box flexDirection="row" alignItems="center" justifyContent="space-between">
        <TouchableOpacity onPress={onWalletSelect} activeOpacity={0.7} style={styles.walletSection}>
          <Text variant="p8" color="bgDark300">
            {walletName}
          </Text>
          {showWalletDropdown && (
            <Ionicons
              name="chevron-down"
              size={14}
              color={theme.colors.textSecondary}
              style={styles.chevronSmall}
            />
          )}
        </TouchableOpacity>

        <Box flexDirection="row" alignItems="center">
          <Ionicons name="wallet-outline" size={14} color={theme.colors.textSecondary} />
          <Text variant="p8" color="textSecondary" style={styles.walletBalance}>
            {walletValue && (
              <Text variant="p8" color="textSecondary" style={{ opacity: 0.7 }}>
                {walletValue}
              </Text>
            )}
          </Text>
          {showAddFunds && (
            <TouchableOpacity
              onPress={onAddFunds}
              activeOpacity={0.7}
              style={styles.addFundsButton}
            >
              <Text variant="p8" color="primary">
                Add Funds
              </Text>
            </TouchableOpacity>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  tokenSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  tokenName: {
    marginRight: 4,
  },
  amountInput: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'SFproSemibold',
    color: '#FFFFFF',
    textAlign: 'right',
    minWidth: 60,
    padding: 0,
  },
  walletSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronSmall: {
    marginLeft: 4,
  },
  walletBalance: {
    marginLeft: 4,
  },
  addFundsButton: {
    marginLeft: 8,
  },
});

export default SwapCard;
