import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

interface LogoutItemProps {
  onPress: () => void;
  bottomInset?: number;
}

const LogoutItem = ({ onPress, bottomInset = 0 }: LogoutItemProps) => {
  const theme = useTheme<Theme>();

  return (
    <Box pb="l" style={{ paddingBottom: bottomInset + 16 }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Box
          flexDirection="row"
          alignItems="center"
          paddingVertical="m"
          paddingHorizontal="m"
          backgroundColor="bg900"
          borderRadius={16}
        >
          <Box
            width={36}
            height={36}
            borderRadius={10}
            backgroundColor="bg800"
            justifyContent="center"
            alignItems="center"
            mr="m"
          >
            <Ionicons name="log-out-outline" size={20} color={theme.colors.danger900} />
          </Box>
          <Text variant="p7" color="danger900" flex={1}>
            Log Out
          </Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default LogoutItem;
