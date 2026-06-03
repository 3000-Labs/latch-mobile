import * as eva from '@eva-design/eva';
import { ThemeProvider as RestyleThemeProvider } from '@shopify/restyle';
import { ApplicationProvider } from '@ui-kitten/components';
import React, { createContext, useContext } from 'react';
import { darkTheme } from './theme';

type ColorMode = 'dark';

interface ThemeContextValue {
  colorMode: ColorMode;
  isDark: true;
  setColorMode: (mode: ColorMode) => void;
  toggleTheme: () => void;
}

const themeValue: ThemeContextValue = {
  colorMode: 'dark',
  isDark: true,
  setColorMode: () => {},
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(themeValue);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={themeValue}>
      <ApplicationProvider {...eva} theme={eva.dark}>
        <RestyleThemeProvider theme={darkTheme}>{children}</RestyleThemeProvider>
      </ApplicationProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
