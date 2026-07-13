import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/src/theme/theme';

export default function MigrationSuccess() {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Box
      flex={1}
      backgroundColor="mainBackground"
      justifyContent="center"
      alignItems="center"
      paddingHorizontal="xl"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Success icon */}
      <Box
        width={96}
        height={96}
        borderRadius={48}
        backgroundColor="primary700"
        justifyContent="center"
        alignItems="center"
        mb="xl"
        style={{ opacity: 0.15, position: 'absolute' }}
      />
      <Box
        width={96}
        height={96}
        borderRadius={48}
        justifyContent="center"
        alignItems="center"
        mb="xl"
        style={{ borderWidth: 2, borderColor: theme.colors.primary700 }}
      >
        <Ionicons name="checkmark" size={48} color={theme.colors.primary700} />
      </Box>

      <Text variant="h7" color="textPrimary" fontWeight="700" textAlign="center" mb="s">
        Migration Complete
      </Text>
      <Text variant="p7" color="textSecondary" textAlign="center" lineHeight={22} mb="xl">
        Your assets have been moved to your smart account. You&apos;re all set.
      </Text>

      <Box width="100%">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.replace('/(tabs)')}
        >
          <Box
            backgroundColor="primary700"
            borderRadius={16}
            paddingVertical="m"
            alignItems="center"
          >
            <Text variant="h11" color="black" fontWeight="700">Go to Dashboard</Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
}
