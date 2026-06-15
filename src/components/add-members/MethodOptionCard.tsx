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
  /** Non-interactive + dimmed (e.g. a method that isn't available yet). */
  disabled?: boolean;
  /** Small chip on the right (e.g. "Soon"). */
  badge?: string;
}

const MethodOptionCard: React.FC<MethodOptionCardProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  image,
  disabled,
  badge,
}) => {
  const theme = useTheme<Theme>();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
      style={disabled ? { opacity: 0.5 } : undefined}
    >
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

        {badge ? (
          <Box backgroundColor="bg200" borderRadius={10} px="s" py="xs">
            <Text variant="p8" color="textSecondary" style={{ fontWeight: '600' }}>
              {badge}
            </Text>
          </Box>
        ) : null}
      </Box>
    </TouchableOpacity>
  );
};

export default MethodOptionCard;
