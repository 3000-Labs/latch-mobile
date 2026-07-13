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
  onAccept?: () => void;
  onDecline?: () => void;
}

const InvitationCard: React.FC<Props> = ({ wallet, onAccept, onDecline }) => {
  const theme = useTheme<Theme>();
  const totalMembers = wallet.invites.length + 1;

  return (
    <Box backgroundColor="cardbg" borderRadius={20} p="m" mb="m">
      {/* Mascot/Icon */}
      <Box alignItems="center" mb="m">
        <Box
          width={56}
          height={56}
          borderRadius={28}
          backgroundColor="primary50"
          justifyContent="center"
          alignItems="center"
        >
          <Ionicons name="people-circle" size={32} color={theme.colors.primary} />
        </Box>
      </Box>

      {/* Headline */}
      <Text variant="title" color="textPrimary" textAlign="center">
        You&apos;ve been invited
      </Text>
      <Text variant="p6" color="textSecondary" textAlign="center" mt="xs" mb="m">
        to join{' '}
        <Text variant="p6" color="textPrimary" style={{ fontWeight: '600' }}>
          {wallet.name}
        </Text>
      </Text>

      {/* Summary */}
      <Box backgroundColor="bg11" borderRadius={14} p="m" mb="m">
        <Box flexDirection="row" alignItems="center" justifyContent="space-between" mb="s">
          <Text variant="p7" color="textSecondary">
            Members
          </Text>
          <Text variant="p7" color="textPrimary" style={{ fontWeight: '600' }}>
            {totalMembers}
          </Text>
        </Box>
        <Box flexDirection="row" alignItems="center" justifyContent="space-between">
          <Text variant="p7" color="textSecondary">
            Approvals required
          </Text>
          <Text variant="p7" color="textPrimary" style={{ fontWeight: '600' }}>
            {wallet.threshold} of {totalMembers}
          </Text>
        </Box>
      </Box>

      <Text variant="p8" color="textSecondary" textAlign="center" mb="m">
        Accepting means your personal account becomes a signer on this wallet.
        You can pick which of your accounts to use after tapping Accept.
      </Text>

      {/* Actions */}
      {onAccept && (
        <Button label="Accept invitation" variant="primary" onPress={onAccept} mb="s" />
      )}
      {onDecline && (
        <Button
          label="Decline"
          variant="ghost"
          labelColor="danger900"
          onPress={onDecline}
        />
      )}
    </Box>
  );
};

export default InvitationCard;
