import { useTheme } from '@shopify/restyle';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { Theme } from '../../theme/theme';

interface Props {
  size?: number;
  color?: keyof Theme['colors'];
}

const DOT_COUNT = 8;

const DottedSpinner: React.FC<Props> = ({ size = 40, color = 'primary' }) => {
  const theme = useTheme<Theme>();
  const activeIndex = useSharedValue(0);

  useEffect(() => {
    activeIndex.value = withRepeat(
      withTiming(DOT_COUNT, {
        duration: 800,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [activeIndex]);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={[styles.container, { width: size, height: size }]}>
        {Array.from({ length: DOT_COUNT }).map((_, i) => {
          const angle = (i * 360) / DOT_COUNT;
          const radius = size / 2.5;
          const x = radius * Math.cos((angle * Math.PI) / 180);
          const y = radius * Math.sin((angle * Math.PI) / 180);

          return (
            <Dot
              key={i}
              i={i}
              activeIndex={activeIndex}
              x={size / 2 + x - 3}
              y={size / 2 + y - 3}
              activeColor={theme.colors[color]}
              inactiveColor={theme.colors.bg800}
            />
          );
        })}
      </View>
    </View>
  );
};

interface DotProps {
  i: number;
  activeIndex: SharedValue<number>;
  x: number;
  y: number;
  activeColor: string;
  inactiveColor: string;
}

const Dot: React.FC<DotProps> = ({ i, activeIndex, x, y, activeColor, inactiveColor }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const isNext = Math.floor(activeIndex.value) === i;
    return {
      backgroundColor: isNext ? activeColor : inactiveColor,
      transform: [{ scale: isNext ? 1.2 : 1 }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedStyle,
        {
          left: x,
          top: y,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default DottedSpinner;
