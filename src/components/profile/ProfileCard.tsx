import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { Dimensions, Pressable, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { shortenAddress } from '@/src/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

interface ProfileCardProps {
  name: string;
  address: string;
  onCopyAddress?: () => void;
  onPress?: () => void;
}

const ProfileCard = ({ name, address, onCopyAddress, onPress }: ProfileCardProps) => {
  const theme = useTheme<Theme>();

  return (
    <Box alignItems="center" mb="xl">
      <Pressable onPress={onPress}>
        <Box
          width={DRAWER_WIDTH - 32}
          backgroundColor="bg11"
          borderRadius={24}
          height={120}
          paddingVertical="m"
          alignItems="center"
        >
          <Box
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor="primary700"
            justifyContent="center"
            alignItems="center"
            mb="xs"
          >
            <Text variant="p7" color="textWhite" fontWeight="700">
              {name.charAt(0) ?? 'A'}
            </Text>
          </Box>
          <Text variant="h10" color="textPrimary">
            {name}
          </Text>
          <Box flexDirection="row" alignItems="center">
            <Text variant="p7" color="textSecondary" mr="xs">
              {shortenAddress(address)}
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCopyAddress?.();
              }}
            >
              <Ionicons name="copy-outline" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Box>
        </Box>
      </Pressable>
    </Box>
  );
};

export default ProfileCard;
