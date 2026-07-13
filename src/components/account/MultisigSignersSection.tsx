import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { useMultisigRoster, type RosterMember } from '@/src/hooks/use-multisig-roster';
import { Theme } from '@/src/theme/theme';

const KIND_LABEL: Record<RosterMember['kind'], string> = {
  ed25519: 'Device key',
  webauthn: 'Passkey',
  delegated: 'Account',
};

interface Props {
  walletName: string;
  address: string;
  onBack: () => void;
}

const MultisigSignersSection = ({ walletName, address, onBack }: Props) => {
  const theme = useTheme<Theme>();
  const { data, isLoading, isError, refetch } = useMultisigRoster(address);

  return (
    <Box paddingHorizontal="m" paddingBottom="xl" flex={1}>
      {/* Header */}
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" py="xs" mb="s">
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="h7" color="textPrimary" fontWeight="800">
          Signers
        </Text>
        <Box width={40} />
      </Box>

      <Text variant="p7" color="textSecondary" mb="m" numberOfLines={1}>
        {walletName}
      </Text>

      {isLoading ? (
        <Box py="xl" alignItems="center">
          <ActivityIndicator color={theme.colors.primary700} />
        </Box>
      ) : isError || !data ? (
        <Box py="l" alignItems="center">
          <Text variant="p7" color="textSecondary" textAlign="center" mb="s">
            Couldn&apos;t load the signer list.
          </Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text variant="p7" color="primary700" fontWeight="700">
              Retry
            </Text>
          </TouchableOpacity>
        </Box>
      ) : (
        <>
          <Box
            backgroundColor="bg11"
            borderRadius={14}
            p="m"
            mb="m"
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text variant="p6" color="textPrimary" fontWeight="700">
              Approvals required
            </Text>
            <Text variant="p6" color="primary700" fontWeight="700">
              {data.threshold} of {data.total}
            </Text>
          </Box>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {data.members.map((m) => (
              <Box
                key={m.id}
                backgroundColor="bg11"
                borderRadius={14}
                p="m"
                mb="s"
                flexDirection="row"
                alignItems="center"
                gap="m"
              >
                <Box
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor="cardbg"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Ionicons
                    name={m.kind === 'delegated' ? 'person-outline' : 'key-outline'}
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </Box>
                <Box flex={1}>
                  <Box flexDirection="row" alignItems="center" gap="xs">
                    <Text variant="p6" color="textPrimary" fontWeight="700">
                      {KIND_LABEL[m.kind]}
                    </Text>
                    {m.isYou && (
                      <Box
                        backgroundColor="primary50"
                        borderRadius={8}
                        paddingHorizontal="xs"
                        paddingVertical="xs"
                      >
                        <Text variant="p8" color="primary900" style={{ fontWeight: '700' }}>
                          You
                        </Text>
                      </Box>
                    )}
                  </Box>
                  <Text variant="p8" color="textSecondary" mt="xs">
                    {m.display}
                  </Text>
                </Box>
              </Box>
            ))}
          </ScrollView>
        </>
      )}
    </Box>
  );
};

export default MultisigSignersSection;
