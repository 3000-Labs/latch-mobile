import * as eva from '@eva-design/eva';
import { ThemeProvider as RestyleThemeProvider } from '@shopify/restyle';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { queryClient } from '../src/api/client';
import theme from '../src/theme/theme';
// import { useAuthStore } from '../src/store/useAuthStore';

import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { LogBox } from 'react-native';

// Removed: export const unstable_settings = { anchor: '(tabs)' };
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();


if (__DEV__) {
  require("../ReactotronConfig.js");
}
LogBox.ignoreAllLogs();


export default function RootLayout() {

  const [fontsLoaded] = useFonts({
    SFproThin: require("../assets/fonts/SFPRO-Thin.ttf"),
    SFproRegular: require("../assets/fonts/SFPRO-Regular.ttf"),
    SFproMedium: require("../assets/fonts/SFPRO-Medium.ttf"),
    SFproBold: require("../assets/fonts/SFPRO-bold.ttf"),
    SFproSemibold: require("../assets/fonts/SFPRO-Semibold.ttf"),
    SFproLight: require("../assets/fonts/SFPRO-Light.ttf"),
    ...Ionicons.font,
  });


  useEffect(() => {
    if (fontsLoaded) {
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {
          /* ignore error */
        });
      }, 500);
    }
  }, [fontsLoaded]);

  // if (
  //   // isLoading || 
  //   !fontsLoaded) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  //       {/* <ActivityIndicator size="large" color={theme.colors.primary} /> */}
  //     </View>
  //   );
  // }

  return (
    <>
      <IconRegistry icons={EvaIconsPack} />
      <ApplicationProvider {...eva} theme={eva.light}>
        <RestyleThemeProvider theme={theme}>
          <QueryClientProvider client={queryClient}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
            <StatusBar style="dark" />
            <Toast />
          </QueryClientProvider>
        </RestyleThemeProvider>
      </ApplicationProvider>
    </>
  );
}
