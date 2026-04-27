import React from 'react';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/src/theme/theme';

const Explore = () => {
  const theme = useTheme<Theme>();
  const isDark = theme.colors.mainBackground === '#000000';
  
  return (
    <Box flex={1} backgroundColor="mainBackground" justifyContent="center" alignItems="center">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Text variant="h8" color="textPrimary">Explore Screen</Text>
      <Text variant="p7" color="textSecondary">Coming Soon</Text>
    </Box>
  );
};

export default Explore;
