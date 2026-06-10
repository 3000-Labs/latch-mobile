import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { useTheme } from '@shopify/restyle';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, View } from 'react-native';

interface ApprovalSliderProps {
  value: number;
  total: number;
  onChange: (value: number) => void;
}

const TRACK_HEIGHT = 6;
const TRACK_RADIUS = 3;
const THUMB_SIZE = 24;
const ROW_HEIGHT = 44; // meets the 44pt touch-target minimum
const TICK_SIZE = 6;
const MAX_TICKS = 12; // skip tick marks past this to avoid crowding

const ApprovalSlider: React.FC<ApprovalSliderProps> = ({ value, total, onChange }) => {
  const { isDark } = useAppTheme();
  const theme = useTheme<Theme>();
  const trackWidth = useRef(0);

  const fillRatio = total > 1 ? (value - 1) / (total - 1) : 1;
  const showTicks = total > 1 && total <= MAX_TICKS;

  // Latest props for the pan handlers (created once) to read without stale closures.
  const valueRef = useRef(value);
  const totalRef = useRef(total);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  totalRef.current = total;
  onChangeRef.current = onChange;

  // Respect reduced motion for the thumb/fill spring.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  // Animate the fill/thumb to the snapped position.
  const progress = useRef(new Animated.Value(fillRatio)).current;
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(fillRatio);
      return;
    }
    Animated.spring(progress, {
      toValue: fillRatio,
      useNativeDriver: false,
      bounciness: 6,
      speed: 16,
    }).start();
  }, [fillRatio, reduceMotion, progress]);

  const positionLeft = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const commit = (next: number) => {
    const clamped = Math.max(1, Math.min(totalRef.current, next));
    if (clamped !== valueRef.current) {
      Haptics.selectionAsync().catch(() => {});
      onChangeRef.current(clamped);
    }
  };

  const updateFromX = (x: number) => {
    const w = trackWidth.current;
    if (w === 0) return;
    const t = totalRef.current;
    const clamped = Math.max(0, Math.min(w, x));
    const ratio = clamped / w;
    commit(Math.round(ratio * (t - 1)) + 1);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => updateFromX(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => updateFromX(evt.nativeEvent.locationX),
    }),
  ).current;

  return (
    <Box backgroundColor="bg11" borderRadius={16} py="s" px="m" width="100%">
      {/* Counter display */}
      <Box flexDirection="row" alignItems="center" justifyContent="center" mb="xs">
        <Text
          style={{
            fontSize: 56,
            lineHeight: 64,
            fontFamily: 'SFproBold',
            color: isDark ? '#FFFFFF' : '#000000',
          }}
        >
          {value}
        </Text>
        <Text variant="p5" color="textSecondary" style={{ marginBottom: 6, marginHorizontal: 6 }}>
          of
        </Text>
        <Text
          style={{
            fontSize: 56,
            lineHeight: 64,
            fontFamily: 'SFproBold',
            color: isDark ? '#FFFFFF' : '#000000',
          }}
        >
          {total}
        </Text>
      </Box>

      {/* Label */}
      <Text variant="p7" color="textSecondary" textAlign="center" mb="l">
        approvals required
      </Text>

      {/* Track */}
      <View
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Approvals required"
        accessibilityValue={{ min: 1, max: total, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') commit(valueRef.current + 1);
          else if (e.nativeEvent.actionName === 'decrement') commit(valueRef.current - 1);
        }}
        style={{ height: ROW_HEIGHT, justifyContent: 'center' }}
      >
        <View
          style={{
            height: TRACK_HEIGHT,
            borderRadius: TRACK_RADIUS,
            backgroundColor: theme.colors.gray900,
          }}
        >
          {/* Filled portion */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: positionLeft,
              backgroundColor: theme.colors.primary700,
              borderRadius: TRACK_RADIUS,
            }}
          />
        </View>

        {/* Discrete stop ticks */}
        {showTicks &&
          Array.from({ length: total }).map((_, i) => {
            const reached = i + 1 <= value;
            return (
              <View
                key={i}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: `${(i / (total - 1)) * 100}%`,
                  width: TICK_SIZE,
                  height: TICK_SIZE,
                  borderRadius: TICK_SIZE / 2,
                  marginLeft: -TICK_SIZE / 2,
                  // A reached tick reads as a notch cut into the fill; an
                  // unreached one is a faint dot on the dark track.
                  backgroundColor: reached ? theme.colors.gray900 : theme.colors.gray700,
                }}
              />
            );
          })}

        {/* Thumb */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: theme.colors.primary700,
            top: (ROW_HEIGHT - THUMB_SIZE) / 2,
            left: positionLeft,
            transform: [{ translateX: -(THUMB_SIZE / 2) }],
            shadowColor: theme.colors.primary700,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
            elevation: 4,
          }}
        />
      </View>

      {/* Min / max labels */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text variant="p8" color="textSecondary">
          1
        </Text>
        <Text variant="p8" color="textSecondary">
          {total}
        </Text>
      </Box>
    </Box>
  );
};

export default ApprovalSlider;
