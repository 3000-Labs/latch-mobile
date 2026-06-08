import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Image } from 'expo-image';
import React from 'react';
import { ImageSourcePropType, TouchableOpacity } from 'react-native';

interface MethodOptionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  image?: ImageSourcePropType;
}

const MethodOptionCard: React.FC<MethodOptionCardProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  image,
}) => {
  const theme = useTheme<Theme>();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Box
        flexDirection="row"
        alignItems="center"
        bg={'bg11'}
        borderColor={'btnDisabled'}
        style={{
          borderWidth: 1,
          borderRadius: 16,
          paddingVertical: 16,
          paddingHorizontal: 16,
          marginBottom: 12,
        }}
      >
        {/* Icon container */}

        {image ? (
          <Image
            source={image}
            style={{
              width: 24,
              height: 24,
              // tintColor: theme.colors.gray900,
            }}
          />
        ) : (
          <Ionicons name={icon} size={24} color={theme.colors.textPrimary} />
        )}

        {/* Text content */}
        <Box flex={1} ml={'m'}>
          <Text variant="h10" color="textPrimary" fontWeight="700">
            {title}
          </Text>
          <Text variant="p7" color="textSecondary" mt="xs">
            {subtitle}
          </Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default MethodOptionCard;
