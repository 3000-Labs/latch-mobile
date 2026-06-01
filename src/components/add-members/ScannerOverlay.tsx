import Text from '@/src/components/shared/Text';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FRAME_SIZE = 260;
const CORNER_LENGTH = 28;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = '#FFAD00';
const FRAME_TOP = (SCREEN_HEIGHT - FRAME_SIZE) / 2 - 40;

const Corner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';

  return (
    <View
      style={[
        styles.cornerBase,
        isTop ? { top: 0 } : { bottom: 0 },
        isLeft ? { left: 0 } : { right: 0 },
      ]}
    >
      {/* Horizontal arm */}
      <View
        style={[
          styles.cornerArm,
          { width: CORNER_LENGTH, height: CORNER_THICKNESS },
          isLeft ? { left: 0 } : { right: 0 },
          isTop ? { top: 0 } : { bottom: 0 },
        ]}
      />
      {/* Vertical arm */}
      <View
        style={[
          styles.cornerArm,
          { width: CORNER_THICKNESS, height: CORNER_LENGTH },
          isLeft ? { left: 0 } : { right: 0 },
          isTop ? { top: 0 } : { bottom: 0 },
        ]}
      />
    </View>
  );
};

const ScannerOverlay: React.FC = () => {
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: FRAME_SIZE - 2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const sideWidth = (SCREEN_WIDTH - FRAME_SIZE) / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Top panel */}
      <View style={[styles.dimPanel, { top: 0, left: 0, right: 0, height: FRAME_TOP }]} />

      {/* Middle row */}
      <View
        style={{
          position: 'absolute',
          top: FRAME_TOP,
          left: '19.5%',
          right: 0,
          height: FRAME_SIZE,
          flexDirection: 'row',
        }}
      >
        {/* Left panel */}
        <View style={[styles.dimPanel, { width: sideWidth, flex: 0 }]} />

        {/* Scan frame */}
        <View style={styles.frame}>
          <Corner position="tl" />
          <Corner position="tr" />
          <Corner position="bl" />
          <Corner position="br" />

          {/* Animated scan line */}
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLine }] }]} />
        </View>

        {/* Right panel */}
        <View style={[styles.dimPanel, { width: sideWidth, flex: 0 }]} />
      </View>

      {/* Bottom panel */}
      <View
        style={[styles.dimPanel, { top: FRAME_TOP + FRAME_SIZE, left: 0, right: 0, bottom: 0 }]}
      />

      {/* Instruction text */}
      <View
        style={{
          position: 'absolute',
          top: FRAME_TOP + FRAME_SIZE + 28,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Text variant="p6" color="white" textAlign="center" style={{ opacity: 0.8 }}>
          Point at a member&apos;s QR code
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dimPanel: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    overflow: 'hidden',
  },
  cornerBase: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
  },
  cornerArm: {
    position: 'absolute',
    backgroundColor: CORNER_COLOR,
    borderRadius: 1,
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: CORNER_COLOR,
    opacity: 0.8,
    borderRadius: 1,
  },
});

export default ScannerOverlay;
