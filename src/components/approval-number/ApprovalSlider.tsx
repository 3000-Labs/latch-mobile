import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { useAppTheme } from '@/src/theme/ThemeContext';
import React, { useRef } from 'react';
import { PanResponder, View } from 'react-native';

interface ApprovalSliderProps {
  value: number;
  total: number;
  onChange: (value: number) => void;
}

const TRACK_HEIGHT = 6;
const TRACK_RADIUS = 3;
const THUMB_SIZE = 18;

const ApprovalSlider: React.FC<ApprovalSliderProps> = ({ value, total, onChange }) => {
  const { isDark } = useAppTheme();
  const trackWidth = useRef(0);

  const fillRatio = total > 1 ? (value - 1) / (total - 1) : 1;

  const updateFromX = (x: number) => {
    if (trackWidth.current === 0) return;
    const clamped = Math.max(0, Math.min(trackWidth.current, x));
    const ratio = clamped / trackWidth.current;
    const snapped = Math.round(ratio * (total - 1)) + 1;
    onChange(Math.max(1, Math.min(total, snapped)));
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
        style={{ height: TRACK_HEIGHT + 24, justifyContent: 'center' }}
      >
        <View
          style={{
            height: TRACK_HEIGHT,
            borderRadius: TRACK_RADIUS,
            backgroundColor: '#2C2C2E',
            overflow: 'hidden',
          }}
        >
          {/* Filled portion */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${fillRatio * 100}%`,
              backgroundColor: '#FFAD00',
              borderRadius: TRACK_RADIUS,
            }}
          />
        </View>

        {/* Thumb */}
        <View
          style={{
            position: 'absolute',
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: '#FFAD00',
            top: (TRACK_HEIGHT + 24 - THUMB_SIZE) / 2,
            left: `${fillRatio * 100}%` as any,
            transform: [{ translateX: -(THUMB_SIZE / 2) }],
            shadowColor: '#FFAD00',
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
