import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import BottomSheet from '@/src/components/shared/BottomSheet';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';

const MOONPAY_API_KEY = process.env.EXPO_PUBLIC_MOONPAY_API_KEY ?? '';

interface Props {
  visible: boolean;
  onClose: () => void;
  onReceive: () => void;
  poolAddress: string;
  memo?: string;
}

const BuyXLMSheet = ({ visible, onClose, onReceive, poolAddress, memo }: Props) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  const openMoonPay = async () => {
    const params: Record<string, string> = {
      apiKey: MOONPAY_API_KEY,
      currencyCode: 'xlm',
      showOnlyCurrencies: 'xlm',
    };
    if (poolAddress) params.walletAddress = poolAddress;
    if (memo) params.walletAddressTag = memo;
    await WebBrowser.openBrowserAsync(
      `https://buy.moonpay.com?${new URLSearchParams(params).toString()}`,
      { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
    >
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" py="m" mb="s">
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="h9" color="textPrimary" fontWeight="700">
          Buy XLM
        </Text>
        <Box width={24} />
      </Box>

      <Text variant="p7" color="textSecondary" mb="l">
        Purchase XLM with a debit card or bank transfer.
      </Text>

      <TouchableOpacity activeOpacity={0.75} onPress={openMoonPay}>
        <Box
          flexDirection="row"
          alignItems="center"
          backgroundColor={isDark ? 'gray900' : 'gray100'}
          borderRadius={16}
          padding="m"
          mb="m"
        >
          <Box
            width={48}
            height={48}
            borderRadius={12}
            backgroundColor="black"
            justifyContent="center"
            alignItems="center"
            mr="m"
          >
            <Text variant="p7" color="white" fontWeight="700">
              MP
            </Text>
          </Box>
          <Box flex={1}>
            <Text variant="p6" color="textPrimary" fontWeight="700">
              MoonPay
            </Text>
            <Text variant="p8" color="textSecondary" mt="xs">
              150+ countries · Card & bank transfer
            </Text>
          </Box>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </Box>
      </TouchableOpacity>

      <Box flexDirection="row" alignItems="center" mb="l">
        <Box flex={1} height={1} backgroundColor="gray800" />
        <Text variant="p7" color="textSecondary" mx="m">
          OR
        </Text>
        <Box flex={1} height={1} backgroundColor="gray800" />
      </Box>

      <TouchableOpacity activeOpacity={0.75} onPress={onReceive}>
        <Box
          height={52}
          borderRadius={26}
          borderWidth={1}
          borderColor="gray800"
          justifyContent="center"
          alignItems="center"
        >
          <Text variant="p6" color="textPrimary" fontWeight="700">
            Receive from another wallet
          </Text>
        </Box>
      </TouchableOpacity>
    </BottomSheet>
  );
};

export default BuyXLMSheet;
