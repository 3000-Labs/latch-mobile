import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

interface NetworkItemProps {
  name: string;
  description: string;
  isSelected: boolean;
}

const NetworkItem = ({ name, description, isSelected }: NetworkItemProps) => {
  const theme = useTheme<Theme>();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor="bg11"
      borderRadius={16}
      padding="m"
      mb="s"
      borderWidth={1}
      borderColor={isSelected ? 'primary' : 'transparent'}
    >
      <SimpleLineIcons name="globe" size={24} color={'#cdcdcd'} />
      <Box flex={1} ml={'m'}>
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {name}
        </Text>
        <Text variant="p8" color="textSecondary" mt="xs">
          {description}
        </Text>
      </Box>
      {isSelected && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
    </Box>
  );
};

export default NetworkItem;
