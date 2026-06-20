/**
 * add-device.tsx — entry point for the "add device" pairing flow.
 *
 * The user picks one of two modes:
 *   - Show code: this device is the initiator; backend mediates the
 *     handoff via a 6-digit code the other device enters.
 *   - Scan QR:   this device is the JOINER; the other (initiator) device
 *     is showing a QR code containing the pairing payload.
 *
 * See docs/multisig-build-plan.md "Phase P2" for the full flow.
 */

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddDevice() {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Box flex={1} backgroundColor="mainBackground" style={{ paddingTop: insets.top }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Box height={56} flexDirection="row" alignItems="center" paddingHorizontal="m">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="h10" color="textPrimary" fontFamily="SFproSemibold" flex={1} textAlign="center" mr="xl">
          Add a device
        </Text>
      </Box>

      <Box paddingHorizontal="l" pt="m">
        <Text variant="p7" color="textSecondary" mb="l" lineHeight={22}>
          Pair another device so it can co-sign sensitive operations on this account. The other device must be signed in to the same Latch wallet.
        </Text>

        <ModeCard
          icon="keypad-outline"
          title="Show pairing code"
          subtitle="This device shows a 6-digit code for the other device to enter."
          onPress={() => router.push('/pair-show-code')}
          theme={theme}
        />
        <Box height={12} />
        <ModeCard
          icon="qr-code-outline"
          title="Show QR code"
          subtitle="The other device scans a QR code instead of typing a code."
          onPress={() => router.push('/pair-show-qr')}
          theme={theme}
        />
        <Box height={28} />
        <Text variant="p7" color="textSecondary" mb="s" style={{ marginLeft: 4 }}>
          Joining a wallet
        </Text>
        <ModeCard
          icon="enter-outline"
          title="Enter a pairing code"
          subtitle="You received a 6-digit code from your other device."
          onPress={() => router.push('/pair-enter-code')}
          theme={theme}
        />
        <Box height={12} />
        <ModeCard
          icon="scan-outline"
          title="Scan a QR code"
          subtitle="Use the camera to scan a pairing QR shown on the other device."
          onPress={() => router.push('/pair-scan-qr')}
          theme={theme}
        />
      </Box>
    </Box>
  );
}

interface ModeCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  theme: Theme;
}

function ModeCard({ icon, title, subtitle, onPress, theme }: ModeCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Box
        backgroundColor="bg11"
        borderRadius={20}
        padding="m"
        flexDirection="row"
        alignItems="center"
      >
        <Box
          width={44}
          height={44}
          borderRadius={22}
          backgroundColor="cardbg"
          justifyContent="center"
          alignItems="center"
          mr="m"
        >
          <Ionicons name={icon} size={22} color={theme.colors.textPrimary} />
        </Box>
        <Box flex={1}>
          <Text variant="h11" color="textPrimary" fontFamily="SFproSemibold">
            {title}
          </Text>
          <Text variant="p7" color="textSecondary" mt="xs" lineHeight={18}>
            {subtitle}
          </Text>
        </Box>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </Box>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
});
