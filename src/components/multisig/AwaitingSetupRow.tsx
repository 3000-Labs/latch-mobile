import type { MultisigWallet } from '@/src/api/multisig';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';

interface Props {
  wallet: MultisigWallet;
}

/**
 * Account-list row for a multisig the user has accepted but the creator
 * hasn't yet deployed. Per P-2 (docs/shared-wallet-concerns.md §2): show
 * pre-deploy with an "Awaiting setup" suffix, but keep the address
 * hidden until deploy completes so users can't accidentally deposit to
 * a non-existent contract.
 */
const AwaitingSetupRow: React.FC<Props> = ({ wallet }) => {
  const theme = useTheme<Theme>();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor="cardbg"
      borderRadius={14}
      p="m"
      mb="s"
      style={{ opacity: 0.65 }}
    >
      <Box
        width={40}
        height={40}
        borderRadius={20}
        backgroundColor="bg200"
        justifyContent="center"
        alignItems="center"
        mr="m"
      >
        <Ionicons name="hourglass-outline" size={18} color={theme.colors.textSecondary} />
      </Box>
      <Box flex={1}>
        <Text variant="p6" color="textPrimary" numberOfLines={1}>
          {wallet.name}{' '}
          <Text variant="p6" color="textSecondary">
            (Awaiting setup)
          </Text>
        </Text>
        <Text variant="p8" color="textSecondary" mt="xs">
          Address available after the creator deploys
        </Text>
      </Box>
    </Box>
  );
};

export default AwaitingSetupRow;
