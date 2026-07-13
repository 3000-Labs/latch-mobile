import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import '@walletconnect/react-native-compat';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import '../shim';
// Now you can import libraries that need crypto
import { Buffer } from 'buffer';
import { Stack } from 'expo-router';
import { install } from 'react-native-quick-crypto';
import { queryClient } from '../src/api/client';
import { toastConfig } from '../src/components/toast/toastConfig';
import { useNetworkStatus } from '../src/hooks/use-network-status';
import { useOtaUpdate } from '../src/hooks/use-ota-update';
import { useWalletConnect } from '../src/hooks/use-walletconnect';
import { AppThemeProvider, useAppTheme } from '../src/theme/ThemeContext';

// Wire React Query's online/offline state to the device's actual connectivity.
// When offline, RQ pauses all queries and retries them once the device comes back.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) =>
    setOnline(state.isConnected !== false && state.isInternetReachable !== false),
  ),
);

install();
global.Buffer = Buffer;

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    enabled: process.env.EXPO_PUBLIC_APP_ENV === 'production',
  });
}

SplashScreen.preventAutoHideAsync();

if (__DEV__) {
  void import('../ReactotronConfig.js');
}

LogBox.ignoreAllLogs(true);

function RootLayoutContent() {
  const { isDark } = useAppTheme();
  useOtaUpdate();
  useWalletConnect();
  useNetworkStatus();

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
        <Stack.Screen name="add-device" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pair-show-code" options={{ headerShown: false }} />
        <Stack.Screen name="pair-enter-code" options={{ headerShown: false }} />
        <Stack.Screen name="pair-show-qr" options={{ headerShown: false }} />
        <Stack.Screen name="pair-scan-qr" options={{ headerShown: false }} />
        <Stack.Screen name="pending-approval" options={{ headerShown: false }} />
        <Stack.Screen name="wc-session-proposal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="wc-session-request" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Toast config={toastConfig} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SFproThin: require('../assets/fonts/SFPRO-Thin.ttf'),
    SFproRegular: require('../assets/fonts/SFPRO-Regular.ttf'),
    SFproMedium: require('../assets/fonts/SFPRO-Medium.ttf'),
    SFproBold: require('../assets/fonts/SFPRO-bold.ttf'),
    SFproRoundedBold: require('../assets/fonts/SFProRounded-Bold.ttf'),
    SFproRoundedMedium: require('../assets/fonts/SFProRounded-Medium.ttf'),
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <IconRegistry icons={EvaIconsPack} />
        <AppThemeProvider>
          <QueryClientProvider client={queryClient}>
            <RootLayoutContent />
          </QueryClientProvider>
        </AppThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
