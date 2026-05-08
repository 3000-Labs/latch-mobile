import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { ImageSourcePropType, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Image } from 'react-native';

interface SupportItemProps {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  image?: ImageSourcePropType;
  onPress?: () => void;
}

const SupportItem = ({ title, description, icon, onPress, image }: SupportItemProps) => {
  const theme = useTheme<Theme>();

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Box
        flexDirection="row"
        alignItems="center"
        backgroundColor="bg11"
        borderRadius={16}
        padding="m"
        mb="s"
      >
        <Box
          width={40}
          height={40}
          borderRadius={12}
          backgroundColor="bg900"
          justifyContent="center"
          alignItems="center"
          mr="m"
        >
          {image ? (
            <Image source={image} style={{ width: 24, height: 24, resizeMode: 'cover' }} />
          ) : (
            <Ionicons name={icon} size={22} color={theme.colors.textPrimary} />
          )}
        </Box>
        <Box flex={1}>
          <Text variant="h11" color="textPrimary" fontWeight="700">
            {title}
          </Text>
          <Text variant="p8" color="textSecondary" mt="xs">
            {description}
          </Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default SupportItem;
