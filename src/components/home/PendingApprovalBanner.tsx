/**
 * PendingApprovalBanner — renders a tappable banner on the home tab when
 * the active smart account has co-sign requests waiting on this device's
 * approval. Tapping it opens /cosign-review for the first packet this device
 * can still approve (falling back to the first pending one).
 *
 * Renders null when count is 0 so it occupies zero layout space when
 * there's nothing pending.
 */

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { usePendingPackets } from '@/src/hooks/use-pending-packets';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { router } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function PendingApprovalBanner() {
  const theme = useTheme<Theme>();
  const { count, requests } = usePendingPackets();
  if (count === 0) return null;

  const target = requests.find((r) => r.canApprove) ?? requests[0];

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/cosign-review', params: { id: target.id } })}
      activeOpacity={0.85}
      style={{ marginHorizontal: 16, marginTop: 8 }}
    >
      <Box
        backgroundColor="bg11"
        borderRadius={16}
        padding="m"
        flexDirection="row"
        alignItems="center"
      >
        <Box
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="cardbg"
          justifyContent="center"
          alignItems="center"
          mr="m"
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.textPrimary} />
        </Box>
        <Box flex={1}>
          <Text variant="p6" color="textPrimary" fontFamily="SFproSemibold">
            {count} pending approval{count === 1 ? '' : 's'}
          </Text>
          <Text variant="p7" color="textSecondary" mt="xs">
            Co-sign requests are waiting on this device.
          </Text>
        </Box>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </Box>
    </TouchableOpacity>
  );
}
