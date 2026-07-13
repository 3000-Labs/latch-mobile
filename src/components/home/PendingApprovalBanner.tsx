/**
 * PendingApprovalBanner — renders a tappable banner on the home tab when
 * the active smart account has co-sign requests waiting on this device's
 * approval. Tapping it opens /cosign-review for the most actionable packet:
 * one this device can still sign, else one ready to broadcast, else the first.
 *
 * The subtitle reflects what the user can actually do (sign vs broadcast vs
 * wait), shows signature progress, and counts down the packet's short expiry
 * (~8min) so a request can't silently lapse while it sits on screen.
 *
 * Renders null when count is 0 so it occupies zero layout space when
 * there's nothing pending.
 */

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { usePendingPackets } from '@/src/hooks/use-pending-packets';
import { useNow } from '@/src/hooks/use-now';
import { formatTimeRemaining, isExpiringSoon } from '@/src/lib/expiry';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { router } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function PendingApprovalBanner() {
  const theme = useTheme<Theme>();
  const { count, requests } = usePendingPackets();
  const now = useNow();
  if (count === 0) return null;

  // Most actionable first: a request needing this device's signature, then one
  // ready to broadcast, then whatever's left (waiting on other signers).
  const target =
    requests.find((r) => r.canApprove) ?? requests.find((r) => r.ready) ?? requests[0];

  const stateLabel = target.canApprove
    ? 'Needs your signature'
    : target.ready
      ? 'Ready to broadcast'
      : 'Waiting on other signers';

  const urgent = isExpiringSoon(target.expiresAt, now);

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
            {stateLabel} · {target.signatureCount}/{target.threshold} signed ·{' '}
            <Text variant="p7" color={urgent ? 'inputError' : 'textSecondary'}>
              {urgent ? 'expires ' : ''}
              {formatTimeRemaining(target.expiresAt, now)}
            </Text>
          </Text>
        </Box>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </Box>
    </TouchableOpacity>
  );
}
