import { useTheme } from '@shopify/restyle';
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { Image, Modal, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import Box from './Box';
import Text from './Text';

interface Props {
  visible?: boolean;
  text?: string;
  subText?: string;
  intensity?: number; // blur intensity
  tint?: 'light' | 'dark' | 'default';
  onPress?: () => void; // optional handler if tapping overlay should do something
}

const DISC_SIZE = 116;
const LOGO_SIZE = 56;
const RING_WIDTH = 3;

const LoadingBlur: React.FC<Props> = ({
  visible = true,
  text = 'Connecting to wallet...',
  subText,
  intensity = 40,
  tint = 'dark',
  onPress,
}) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  const rotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 1100, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rotation);
    }
    return () => cancelAnimation(rotation);
  }, [visible, rotation]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onPress}
    >
      <View style={styles.container} pointerEvents="auto">
        <TouchableWithoutFeedback onPress={onPress}>
          <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.center}>
          <Box alignItems="center" justifyContent="center" gap="m">
            <View style={styles.discWrap}>
              <View
                style={[
                  styles.disc,
                  {
                    backgroundColor: isDark ? '#1A1407' : theme.colors.primary100,
                    // shadowColor: theme.colors.primary700,
                  },
                ]}
              >
                <Image
                  source={require('@/src/assets/images/Glow.png')}
                  style={styles.glow}
                  resizeMode="cover"
                />
                <Image
                  source={require('@/src/assets/images/Union.png')}
                  style={{
                    width: LOGO_SIZE,
                    height: LOGO_SIZE,
                    tintColor: theme.colors.primary700,
                    shadowColor: theme.colors.primary700,
                  }}
                  resizeMode="contain"
                />
              </View>

              <Animated.View
                pointerEvents="none"
                style={[styles.ring, { borderTopColor: theme.colors.primary700 }, ringStyle]}
              />
            </View>

            <Text variant="h9" fontFamily={'SFproSemibold'} color={isDark ? 'textWhite' : 'black'}>
              {text}
            </Text>
            {subText && (
              <Text variant="h11" color={isDark ? 'textWhite' : 'black'} textAlign="center">
                {subText}
              </Text>
            )}
          </Box>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  center: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  discWrap: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: DISC_SIZE - RING_WIDTH * 4,
    height: DISC_SIZE - RING_WIDTH * 4,
    borderRadius: (DISC_SIZE - RING_WIDTH * 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // shadowOffset: { width: 0, height: 0 },
    // shadowOpacity: 0.55,
    // shadowRadius: 24,
    // elevation: 12,
  },
  glow: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  ring: {
    position: 'absolute',
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    borderWidth: RING_WIDTH,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});

export default LoadingBlur;
