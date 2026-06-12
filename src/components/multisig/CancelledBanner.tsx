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
  onDismiss?: () => void;
}

/**
 * Terminal-state surface for a cancelled multisig. Used in both the
 * creator's "Pending wallets" list (replaces the active card) and the
 * invitee's invitation inbox once the wallet has been cancelled.
 */
const CancelledBanner: React.FC<Props> = ({ wallet, onDismiss }) => {
  const theme = useTheme<Theme>();

  return (
    <Box
      backgroundColor="cardbg"
      borderRadius={20}
      p="m"
      mb="m"
      borderWidth={1}
      borderColor="danger800"
    >
      <Box flexDirection="row" alignItems="center" mb="s">
        <Box
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="danger50"
          justifyContent="center"
          alignItems="center"
          mr="m"
        >
          <Ionicons name="close-circle" size={20} color={theme.colors.danger900} />
        </Box>
        <Box flex={1}>
          <Text variant="p6" color="textPrimary">
            {wallet.name}
          </Text>
          <Text variant="p7" color="danger900" mt="xs">
            Wallet cancelled
          </Text>
        </Box>
      </Box>

      {wallet.cancelledReason ? (
        <Box backgroundColor="bg11" borderRadius={10} p="s" mb="s">
          <Text variant="p8" color="textSecondary">
            Reason
          </Text>
          <Text variant="p7" color="textPrimary" mt="xs">
            {wallet.cancelledReason}
          </Text>
        </Box>
      ) : null}

      {onDismiss && (
        <Button label="Dismiss" variant="ghost" labelColor="textSecondary" onPress={onDismiss} />
      )}
    </Box>
  );
};

export default CancelledBanner;
