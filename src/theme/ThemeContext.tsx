import * as eva from '@eva-design/eva';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider as RestyleThemeProvider } from '@shopify/restyle';
import { ApplicationProvider } from '@ui-kitten/components';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from './theme';

type ColorMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  colorMode: ColorMode;
  isDark: boolean;
  setColorMode: (mode: ColorMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = '@latch_theme_mode';

const ThemeContext = createContext<ThemeContextValue>({
  colorMode: 'system',
  isDark: true,
  setColorMode: () => {},
  toggleTheme: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setColorModeState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setColorMode = useCallback(async (mode: ColorMode) => {
    setColorModeState(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const resolvedScheme = colorMode === 'system' ? (systemScheme ?? 'dark') : colorMode;
  const isDark = resolvedScheme === 'dark';

  const toggleTheme = useCallback(() => {
    setColorMode(isDark ? 'light' : 'dark');
  }, [isDark, setColorMode]);

  const activeTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ colorMode, isDark, setColorMode, toggleTheme }}>
      <ApplicationProvider {...eva} theme={isDark ? eva.dark : eva.light}>
        <RestyleThemeProvider theme={activeTheme}>
          {children}
        </RestyleThemeProvider>
      </ApplicationProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
