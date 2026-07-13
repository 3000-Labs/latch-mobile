import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import BottomSheet from '@/src/components/shared/BottomSheet';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const steps = [
  'Send XLM from any Stellar wallet to the proxy G-address below',
  'Include the memo exactly as shown',
  'Your funds will be forwarded to your Smart Account automatically',
];

const FundInfoSheet: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      backgroundStyle={{
        backgroundColor: isDark ? theme.colors.gray900 : theme.colors.btnDisabled,
      }}
    >
      <Box paddingHorizontal="l">
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
          <Text variant="h7" color="textPrimary" fontWeight="700">
            How it works
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </Box>

        <Box gap="m">
          {steps.map((step, index) => (
            <Box key={index} flexDirection="row" gap="s">
              <Text variant="p6" color="textPrimary" fontFamily={'SFProBold'}>
                {index + 1}
              </Text>
              <Text variant="p6" color="textTertiary" flex={1}>
                {step}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default FundInfoSheet;
