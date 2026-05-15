import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

interface AddAccountPromptProps {
  onBack: () => void;
  onCreatePress: () => void;
}

const AddAccountPrompt = ({ onBack, onCreatePress }: AddAccountPromptProps) => {
  const theme = useTheme<Theme>();

  return (
    <Box paddingHorizontal="m" paddingBottom="xl">
      {/* Header */}
      <Box flexDirection={'row'} alignItems="center" justifyContent="space-between" py="xs" mb="m">
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <Text variant="h7" color="textPrimary" fontWeight="800">
          Add Account
        </Text>
        <Box width={40} />
      </Box>

      {/* Options List */}
      <Box gap="xs">
        {/* Create Smart Account Option */}
        <TouchableOpacity activeOpacity={0.8} onPress={onCreatePress}>
          <Box padding="l" borderRadius={24} borderWidth={1.5} borderColor="primary700">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="s">
              <Text variant="h9" color="textPrimary" fontWeight="700">
                Create Smart Account
              </Text>
              <Text
                variant="h12"
                color="primary700"
                fontWeight="700"
                style={{ letterSpacing: 0.5 }}
              >
                Recommended
              </Text>
            </Box>
            <Text variant="p7" color="textSecondary" lineHeight={22}>
              Set up a fresh account powered by smart contracts. Enjoy advanced security like
              multisig and session keys.
            </Text>
          </Box>
        </TouchableOpacity>

        {/* Connect Existing Option */}
        <TouchableOpacity activeOpacity={0.8}>
          <Box
            padding="l"
            // backgroundColor="bg11"
            borderRadius={24}
            // borderWidth={1.5}
            // borderColor="primary700"
          >
            <Box mb="s">
              <Text variant="h9" color="textPrimary" fontWeight="700">
                Connect Existing
              </Text>
            </Box>
            <Text variant="p7" color="textSecondary" lineHeight={22}>
              Import a hardware wallet, traditional Stellar account, or another Smart Account you
              already own.
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default AddAccountPrompt;
