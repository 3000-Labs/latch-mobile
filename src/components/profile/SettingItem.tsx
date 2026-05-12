import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}

const SettingItem = ({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  rightElement,
}: SettingItemProps) => {
  const theme = useTheme<Theme>();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Box
        flexDirection="row"
        alignItems="center"
        paddingVertical="m"
        paddingHorizontal="m"
        backgroundColor="bg11"
        borderRadius={16}
        mb="s"
      >
        <Box
          width={36}
          height={36}
          borderRadius={10}
          style={{ backgroundColor: '#1E1E1E' }}
          justifyContent="center"
          alignItems="center"
          mr="m"
        >
          <Ionicons name={icon} size={20} color={theme.colors.textPrimary} />
        </Box>
        <Text variant="p7" color="textPrimary" flex={1}>
          {label}
        </Text>
        {value && (
          <Text variant="p7" color="textSecondary" mr="s">
            {value}
          </Text>
        )}
        {rightElement}
        {showChevron && (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        )}
      </Box>
    </TouchableOpacity>
  );
};

export default SettingItem;
