import type { MultisigWallet } from '@/src/api/multisig';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';

interface Props {
  wallet: MultisigWallet;
  onCancel?: () => void;
  onDeploy?: () => void;
}

const truncate = (addr: string): string =>
  addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

const PendingWalletCard: React.FC<Props> = ({ wallet, onCancel, onDeploy }) => {
  const theme = useTheme<Theme>();
  const isReady = wallet.state === 'ready_to_deploy';

  const totalMembers = wallet.invites.length + 1; // +1 for creator
  const acceptedCount = wallet.invites.filter((i) => i.state === 'accepted').length + 1;

  return (
    <Box backgroundColor="cardbg" borderRadius={20} p="m" mb="m">
      {/* Header */}
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" mb="m">
        <Box flex={1} mr="s">
          <Text variant="headline" color="textPrimary" numberOfLines={1}>
            {wallet.name}
          </Text>
          <Text variant="p7" color="textSecondary" mt="xs">
            {wallet.threshold} of {totalMembers} approvals required
          </Text>
        </Box>
        <Box
          backgroundColor={isReady ? 'success50' : 'bg11'}
          borderRadius={14}
          paddingHorizontal="s"
          paddingVertical="xs"
        >
          <Text
            variant="p8"
            color={isReady ? 'success900' : 'textSecondary'}
            style={{ fontWeight: '600' }}
          >
            {isReady ? 'Ready to deploy' : `${acceptedCount}/${totalMembers} ready`}
          </Text>
        </Box>
      </Box>

      {/* Member roster */}
      <Box backgroundColor="bg11" borderRadius={14} p="s">
        {/* Creator row */}
        <Box flexDirection="row" alignItems="center" py="xs">
          <Box
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor="primary50"
            justifyContent="center"
            alignItems="center"
            mr="s"
          >
            <Ionicons name="person" size={14} color={theme.colors.primary} />
          </Box>
          <Box flex={1}>
            <Text variant="p6" color="textPrimary">
              You (creator)
            </Text>
            <Text variant="p8" color="textSecondary">
              {truncate(wallet.creatorCAddress)}
            </Text>
          </Box>
          <Ionicons name="checkmark-circle" size={18} color={theme.colors.success600} />
        </Box>

        {/* Invite rows */}
        {wallet.invites.map((inv) => {
          const label = inv.inviteeEmail ?? (inv.boundCAddress ? truncate(inv.boundCAddress) : '—');
          const sub = inv.boundCAddress
            ? truncate(inv.boundCAddress)
            : inv.inviteeEmail
              ? 'Pending response'
              : '';
          const showCheck = inv.state === 'accepted';
          const showHourglass = inv.state === 'pending';
          const showDecline = inv.state === 'declined';

          return (
            <Box key={inv.id} flexDirection="row" alignItems="center" py="xs">
              <Box
                width={28}
                height={28}
                borderRadius={14}
                backgroundColor={inv.inviteeEmail ? 'bg200' : 'primary50'}
                justifyContent="center"
                alignItems="center"
                mr="s"
              >
                <Ionicons
                  name={inv.inviteeEmail ? 'mail-outline' : 'wallet-outline'}
                  size={14}
                  color={
                    inv.inviteeEmail ? theme.colors.textSecondary : theme.colors.primary
                  }
                />
              </Box>
              <Box flex={1}>
                <Text variant="p6" color="textPrimary" numberOfLines={1}>
                  {label}
                </Text>
                {sub ? (
                  <Text variant="p8" color="textSecondary" numberOfLines={1}>
                    {sub}
                  </Text>
                ) : null}
              </Box>
              {showCheck && (
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.success600} />
              )}
              {showHourglass && (
                <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
              )}
              {showDecline && (
                <Ionicons name="close-circle" size={18} color={theme.colors.danger900} />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Actions */}
      <Box mt="m">
        {isReady && onDeploy && (
          <Button label="Deploy wallet" variant="primary" onPress={onDeploy} mb="s" />
        )}
        {onCancel && (
          <Button
            label="Cancel wallet"
            variant="ghost"
            labelColor="danger900"
            onPress={onCancel}
          />
        )}
      </Box>

    </Box>
  );
};

export default PendingWalletCard;
