import { useAppTheme } from '@/src/theme/ThemeContext';

export function useStatusBarStyle(): 'light' | 'dark' {
  const { isDark } = useAppTheme();
  return isDark ? 'light' : 'dark';
}
