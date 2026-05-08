import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

interface ProfileCardProps {
  name: string;
  address: string;
  onCopyAddress?: () => void;
}

const ProfileCard = ({ name, address, onCopyAddress }: ProfileCardProps) => {
  const theme = useTheme<Theme>();

  return (
    <Box alignItems="center" mb="xl">
      <Box
        width={DRAWER_WIDTH - 32}
        backgroundColor="bg11"
        borderRadius={24}
        height={120}
        paddingVertical="m"
        alignItems="center"
      >
        <Box mb="s">
          <Image
            source={require('@/src/assets/token/user.png')}
            style={{ width: 40, height: 40, borderRadius: 40 }}
          />
        </Box>
        <Text variant="h10" color="textPrimary" mb="xs">
          {name}
        </Text>
        <Box flexDirection="row" alignItems="center">
          <Text variant="p7" color="textSecondary" mr="xs">
            {address}
          </Text>
          <TouchableOpacity onPress={onCopyAddress}>
            <Ionicons name="copy-outline" size={14} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </Box>
      </Box>
    </Box>
  );
};

export default ProfileCard;
