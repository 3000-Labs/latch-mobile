import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';

/**
 * The wallet creator, shown as a fixed signer at the top of the member list.
 * Display-only: the creator's signer is read from the local credential at
 * deploy time (see shared-wallet-review), so this card is never part of the
 * removable `members` state and has no remove control.
 */
const SelfMemberCard: React.FC = () => {
  const theme = useTheme<Theme>();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor="bg11"
      mb="m"
      style={{ borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14 }}
    >
      <Box
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: '#2A2A2A',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name="person-outline" size={18} color={theme.colors.gray500} />
      </Box>

      <Box flex={1} alignItems={'center'} flexDirection={'row'} gap={'s'}>
        <Text variant="h10" color="textPrimary" fontWeight="700">
          You
        </Text>
        <Box
          paddingHorizontal="s"
          paddingVertical="xs"
          borderRadius={8}
          style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)' }}
        >
          <Text variant="h12" color="primary700" fontWeight="700">
            Default Owner
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default SelfMemberCard;
