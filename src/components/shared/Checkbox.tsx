import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import Box from './Box';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const CHECKBOX_SIZE = 24;

const Checkbox: React.FC<Props> = ({ checked, onChange, disabled }) => {
  const theme = useTheme<Theme>();
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(checked ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [checked]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', theme.colors.primary]
    );

    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [theme.colors.bg700, theme.colors.primary]
    );

    return {
      backgroundColor,
      borderColor,
      transform: [{ scale: withSpring(checked ? 1 : 0.95) }],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [{ scale: progress.value }],
    };
  });

  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.container,
          animatedContainerStyle,
          { width: CHECKBOX_SIZE, height: CHECKBOX_SIZE, borderRadius: CHECKBOX_SIZE / 2 },
        ]}
      >
        <Animated.View style={animatedIconStyle}>
          <Ionicons name="checkmark" size={16} color="white" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Checkbox;
