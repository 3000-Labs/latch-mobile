import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';

interface LogoutItemProps {
  onPress: () => void;
  bottomInset?: number;
}

const LogoutItem = ({ onPress, bottomInset = 0 }: LogoutItemProps) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  return (
    <Box pb="l" style={{ paddingBottom: bottomInset + 16 }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Box
          flexDirection="row"
          alignItems="center"
          paddingVertical="m"
          paddingHorizontal="m"
          backgroundColor="bg11"
          borderRadius={16}
        >
          <Box
            width={36}
            height={36}
            borderRadius={10}
            style={{ backgroundColor: isDark ? '#1E1E1E' : theme.colors.gray200 }}
            justifyContent="center"
            alignItems="center"
            mr="m"
          >
            <Ionicons name="log-out-outline" size={20} color={theme.colors.danger900} />
          </Box>
          <Text variant="h11" color="danger900" flex={1}>
            Log Out
          </Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default LogoutItem;
