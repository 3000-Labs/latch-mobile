import type { MultisigWallet } from '@/src/api/multisig';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface Props {
  wallet: MultisigWallet;
  onPress?: () => void;
}

const truncate = (addr: string): string =>
  addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

/**
 * Account-list row for a deployed multisig — looks like a regular
 * account entry. Used in the account switcher / wallet list once the
 * wallet's c_address is on-chain.
 */
const DeployedAccountRow: React.FC<Props> = ({ wallet, onPress }) => {
  const theme = useTheme<Theme>();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Box
        flexDirection="row"
        alignItems="center"
        backgroundColor="cardbg"
        borderRadius={14}
        p="m"
        mb="s"
      >
        <Box
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="primary50"
          justifyContent="center"
          alignItems="center"
          mr="m"
        >
          <Ionicons name="people" size={18} color={theme.colors.primary} />
        </Box>
        <Box flex={1}>
          <Text variant="p6" color="textPrimary" numberOfLines={1}>
            {wallet.name}
          </Text>
          <Text variant="p8" color="textSecondary" mt="xs">
            {wallet.cAddress ? truncate(wallet.cAddress) : ''}
          </Text>
        </Box>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      </Box>
    </TouchableOpacity>
  );
};

export default DeployedAccountRow;
