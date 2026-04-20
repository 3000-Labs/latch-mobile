import { Ionicons } from '@expo/vector-icons';
import {
  boxRestyleFunctions,
  createRestyleComponent,
  createVariant,
  useTheme,
  VariantProps,
} from '@shopify/restyle';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Theme } from '../../theme/theme';
import Box, { BoxProps } from './Box';
import Text from './Text';

const buttonVariant = createVariant<Theme, 'buttonVariants'>({
  themeKey: 'buttonVariants',
});

const ButtonContainer = createRestyleComponent<
  VariantProps<Theme, 'buttonVariants'> & BoxProps,
  Theme
  // @ts-ignore
>([buttonVariant, ...boxRestyleFunctions], TouchableOpacity);

type ButtonVariant = Exclude<keyof Theme['buttonVariants'], 'defaults'>;

interface Props extends BoxProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: any;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  labelColor?: keyof Theme['colors'];
}

const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  leftIcon,
  rightIcon,
  labelColor,
  bg,
  ...rest
}) => {
  const theme = useTheme<Theme>();

  // Determine label and icon colors based on variant
  const isLightBackground = variant === 'primary' || variant === 'highlight';
  const defaultLabelColor = isLightBackground ? 'black' : 'white';
  const finalLabelColor = labelColor || defaultLabelColor;

  return (
    <ButtonContainer
      variant={disabled ? 'disabled' : variant}
      // @ts-ignore
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      flexDirection="row"
      backgroundColor={loading ? 'btnHover' : bg}
      {...rest}
    >
      {leftIcon && !loading && <Box marginRight="s">{leftIcon}</Box>}
      {loading && (
        <Box marginRight="s">
          <ActivityIndicator color={theme.colors.primary700} />
        </Box>
      )}
      <Text variant="body" fontWeight="bold" color={finalLabelColor} style={styles.label}>
        {label}
      </Text>
      {rightIcon && (
        <Box marginLeft="s">
          <Ionicons name={rightIcon} size={22} color={theme.colors[finalLabelColor]} />
        </Box>
      )}
    </ButtonContainer>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 18,
    textAlign: 'center',
  },
});

export default Button;
