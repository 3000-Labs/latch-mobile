import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const ONBOARDING_KEY = '@latch_onboarding_complete';

const SplashAnimation = () => {
  const router = useRouter();

  // Animation values for each letter
  const logoOpacity = useSharedValue(0);
  const lOpacity = useSharedValue(0);
  const aOpacity = useSharedValue(0);
  const tOpacity = useSharedValue(0);
  const cOpacity = useSharedValue(0);
  const hOpacity = useSharedValue(0);

  const checkUserStatusAndNavigate = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (onboardingComplete === 'true') {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding');
      }
    } catch (e) {
      router.replace('/onboarding');
    }
  };

  useEffect(() => {
    // 1. Kick off the visual animations (UI thread)
    logoOpacity.value = withTiming(1, { duration: 600 });
    lOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    aOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    tOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
    cOpacity.value = withDelay(1100, withTiming(1, { duration: 400 }));
    hOpacity.value = withDelay(1300, withTiming(1, { duration: 400 }));

    // 2. Trigger the JS navigation after the total duration (2.7s)
    const timer = setTimeout(() => {
      checkUserStatusAndNavigate();
    }, 2700);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: interpolate(logoOpacity.value, [0, 1], [0.8, 1], Extrapolate.CLAMP) }],
  }));

  const getLetterStyle = (opacity: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: interpolate(opacity.value, [0, 1], [15, 0], Extrapolate.CLAMP) }],
    }));

  return (
    <Box flex={1} backgroundColor="mainBackground" justifyContent="center" alignItems="center">
      <Box flexDirection="column" justifyContent={'center'} alignItems="center" gap={'m'}>
        <Animated.View style={logoStyle}>
          <Image
            source={require('@/src/assets/images/logoLoading.png')}
            style={{ width: 115, height: 65 }}
            resizeMode="contain"
          />
        </Animated.View>

        <Box flexDirection="row" marginLeft="m">
          <Animated.View style={getLetterStyle(lOpacity)}>
            <Text variant="displayItalic">L</Text>
          </Animated.View>
          <Animated.View style={getLetterStyle(aOpacity)}>
            <Text variant="displayItalic">a</Text>
          </Animated.View>
          <Animated.View style={getLetterStyle(tOpacity)}>
            <Text variant="displayItalic">t</Text>
          </Animated.View>
          <Animated.View style={getLetterStyle(cOpacity)}>
            <Text variant="displayItalic">c</Text>
          </Animated.View>
          <Animated.View style={getLetterStyle(hOpacity)}>
            <Text variant="displayItalic">h</Text>
          </Animated.View>
        </Box>
      </Box>
    </Box>
  );
};

export default SplashAnimation;

const styles = StyleSheet.create({});
