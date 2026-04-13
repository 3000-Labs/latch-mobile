import { useTheme } from '@shopify/restyle';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Theme } from '../../theme/theme';
import Box from './Box';

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const SWITCH_WIDTH = 64;
const SWITCH_HEIGHT = 32;
const THUMB_HEIGHT = 26;
const THUMB_WIDTH = 36;
const PADDING = 3;
const TRANSLATE_X = SWITCH_WIDTH - THUMB_WIDTH - PADDING * 2;

const Switch: React.FC<Props> = ({ value, onValueChange, disabled }) => {
  const theme = useTheme<Theme>();
  const translateX = useSharedValue(value ? TRANSLATE_X : 0);

  useEffect(() => {
    translateX.value = withSpring(value ? TRANSLATE_X : 0, {
      mass: 0.8,
      damping: 12,
      stiffness: 120,
    });
  }, [value]);

  const trackAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [0, TRANSLATE_X],
      [theme.colors.bg800, theme.colors.primary]
    );

    const borderColor = interpolateColor(
      translateX.value,
      [0, TRANSLATE_X],
      [theme.colors.bg700, theme.colors.primary]
    );

    return {
      backgroundColor,
      borderColor,
      borderWidth: 1.5,
    };
  });

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={[
          styles.track,
          trackAnimatedStyle,
          { width: SWITCH_WIDTH, height: SWITCH_HEIGHT, borderRadius: SWITCH_HEIGHT / 2 },
        ]}
      >
        {/* On Icon (Line) */}
        <Box
          position="absolute"
          left={14}
          top={0}
          bottom={0}
          justifyContent="center"
          alignItems="center"
        >
          <Box width={3} height={10} backgroundColor="white" borderRadius={1} />
        </Box>

        {/* Off Icon (Circle) */}
        <Box
          position="absolute"
          right={7.5}
          top={0}
          bottom={0}
          justifyContent="center"
          alignItems="center"
        >
          <Box
            width={10}
            height={10}
            borderRadius={7}
            borderWidth={2}
            borderColor="bg400"
          />
        </Box>

        <Animated.View
          style={[
            styles.thumb,
            thumbAnimatedStyle,
            {
              width: THUMB_WIDTH,
              height: THUMB_HEIGHT,
              borderRadius: THUMB_HEIGHT / 2,
              backgroundColor: theme.colors.white,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    padding: PADDING,
    justifyContent: 'center',
  },
  thumb: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default Switch;
