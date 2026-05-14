import { Ionicons } from '@expo/vector-icons';
import { QueryClientProvider } from '@tanstack/react-query';
import { IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import 'react-native-get-random-values';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import '../shim';
// Now you can import libraries that need crypto
import { Buffer } from 'buffer';
import { Stack } from 'expo-router';
import { install } from 'react-native-quick-crypto';
import { queryClient } from '../src/api/client';
import { AppThemeProvider, useAppTheme } from '../src/theme/ThemeContext';

install();
global.Buffer = Buffer;

SplashScreen.preventAutoHideAsync();

if (__DEV__) {
  void import('../ReactotronConfig.js');
}

LogBox.ignoreAllLogs(true);

function RootLayoutContent() {
  const { isDark } = useAppTheme();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="send-token" options={{ presentation: 'modal' }} />
        <Stack.Screen name="receive-token" options={{ presentation: 'modal' }} />
        <Stack.Screen name="address-book" options={{ presentation: 'modal' }} />
        <Stack.Screen name="network-settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notification" options={{ presentation: 'modal' }} />
        <Stack.Screen name="help-support" options={{ presentation: 'modal' }} />
        <Stack.Screen name="about" options={{ presentation: 'modal' }} />
        <Stack.Screen name="qrcode-scan" options={{ headerShown: false }} />
        <Stack.Screen name="filter-sheet" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Toast />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SFproThin: require('../assets/fonts/SFPRO-Thin.ttf'),
    SFproRegular: require('../assets/fonts/SFPRO-Regular.ttf'),
    SFproMedium: require('../assets/fonts/SFPRO-Medium.ttf'),
    SFproBold: require('../assets/fonts/SFPRO-bold.ttf'),
    SFproSemibold: require('../assets/fonts/SFPRO-Semibold.ttf'),
    SFproSemiboldItalic: require('../assets/fonts/SFPRO-Semibolditalic.otf'),
    SFproLight: require('../assets/fonts/SFPRO-Light.ttf'),
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded) {
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 500);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <IconRegistry icons={EvaIconsPack} />
      <AppThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutContent />
        </QueryClientProvider>
      </AppThemeProvider>
    </>
  );
}
