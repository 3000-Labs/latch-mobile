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
import Box from './Box';

interface Props {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

const RADIO_SIZE = 24;
const DOT_SIZE = 10;

const Radio: React.FC<Props> = ({ selected, onSelect, disabled }) => {
  const theme = useTheme<Theme>();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [selected]);

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
    };
  });

  const animatedDotStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [{ scale: progress.value }],
    };
  });

  return (
    <Pressable
      onPress={() => !disabled && onSelect()}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.container,
          animatedContainerStyle,
          { width: RADIO_SIZE, height: RADIO_SIZE, borderRadius: RADIO_SIZE / 2 },
        ]}
      >
        <Animated.View
          style={[
            styles.dot,
            animatedDotStyle,
            {
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: theme.colors.white,
            },
          ]}
        />
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
  dot: {
    // Basic styles handled in animated style
  },
});

export default Radio;
