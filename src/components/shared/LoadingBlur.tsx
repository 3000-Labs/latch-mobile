import { useTheme } from '@shopify/restyle';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Image, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

import { Theme } from '@/src/theme/theme';
import Box from './Box';
import Text from './Text';

interface Props {
  visible?: boolean;
  text?: string;
  intensity?: number; // blur intensity
  tint?: 'light' | 'dark' | 'default';
  onPress?: () => void; // optional handler if tapping overlay should do something
}

const LoadingBlur: React.FC<Props> = ({
  visible = true,
  text = 'Connecting to wallet...',
  intensity = 30,
  tint = 'dark',
  onPress,
}) => {
  const theme = useTheme<Theme>();

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="auto">
      <TouchableWithoutFeedback onPress={onPress}>
        <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <View style={styles.center}>
        <Box alignItems="center" justifyContent="center" gap="m">
          <Image
            source={require('@/src/assets/images/logoLoading.png')}
            style={{ width: 72, height: 72, tintColor: theme.colors.primary700 }}
            resizeMode="contain"
          />
          <Text variant="h10" color="textWhite">
            {text}
          </Text>
        </Box>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
});

export default LoadingBlur;
