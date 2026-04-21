import { useTheme } from '@shopify/restyle';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Theme } from '../../theme/theme';
import Box from './Box';

interface Props {
  total: number;
  activeIndex: number;
}

const DOT_SIZE = 10;
const ACTIVE_WIDTH = 26;
const SPACING = 8;

const ProgressPagination: React.FC<Props> = ({ total, activeIndex }) => {
  const theme = useTheme<Theme>();

  return (
    <Box flexDirection="row" alignItems="center">
      {Array.from({ length: total }).map((_, index) => (
        <PaginationDot key={index} index={index} activeIndex={activeIndex} theme={theme} />
      ))}
    </Box>
  );
};

interface DotProps {
  index: number;
  activeIndex: number;
  theme: Theme;
}

const PaginationDot: React.FC<DotProps> = ({ index, activeIndex, theme }) => {
  const isActive = index === activeIndex;
  const width = useSharedValue(isActive ? ACTIVE_WIDTH : DOT_SIZE);

  useEffect(() => {
    width.value = withSpring(isActive ? ACTIVE_WIDTH : DOT_SIZE, {
      damping: 20,
      stiffness: 200,
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
      backgroundColor: isActive ? theme.colors.primary : theme.colors.bg800,
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedStyle,
        {
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          marginHorizontal: SPACING / 3,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  dot: {
    // Basic styles handled in animated style or inline
  },
});

export default ProgressPagination;
