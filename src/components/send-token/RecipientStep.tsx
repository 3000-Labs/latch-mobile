import React from 'react';
import { Image, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { WALLETS, Wallet } from './types';

interface Props {
  onSelectWallet: (wallet: Wallet) => void;
}

const RecipientStep = ({ onSelectWallet }: Props) => {
  const theme = useTheme<Theme>();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }}
    >
      <Text variant="h11" color="textPrimary" fontWeight="700" mb="s" style={{ fontSize: 15 }}>
        Recipient Address
      </Text>

      <Box
        flexDirection="row"
        alignItems="center"
        backgroundColor="bg11"
        borderRadius={12}
        paddingHorizontal="m"
        height={64}
        borderWidth={1}
        borderColor="gray900"
        mb="l"
      >
        <TextInput
          placeholder="G... or C ..."
          placeholderTextColor="#505050"
          style={{
            flex: 1,
            color: theme.colors.white,
            fontSize: 16,
            fontFamily: 'SFproRegular',
          }}
        />
        <TouchableOpacity>
          <Ionicons name="qr-code-outline" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      </Box>

      <Box flexDirection="row" alignItems="center" mb="l" style={{ marginTop: 4 }}>
        <Ionicons name="book-outline" size={18} color="#8E8E93" />
        <Text variant="p7" color="textSecondary" ml="s" style={{ color: '#8E8E93', fontSize: 13 }}>
          Address Book
        </Text>
      </Box>

      <Box gap="l">
        {WALLETS.map((wallet, index) => (
          <TouchableOpacity key={index} activeOpacity={0.7} onPress={() => onSelectWallet(wallet)}>
            <Box flexDirection="row" alignItems="center">
              <Box
                width={36}
                height={36}
                borderRadius={8}
                backgroundColor="transparent"
                justifyContent="center"
                alignItems="center"
                mr="m"
              >
                <Image
                  source={require('@/src/assets/icon/yellow-user.png')}
                  style={{ width: 36, height: 36, borderRadius: 8 }}
                />
              </Box>
              <Box>
                <Text variant="p7" color="textPrimary" fontWeight="700">
                  {wallet.name}
                </Text>
                <Text variant="p8" color="textSecondary" mt="xs" style={{ color: '#8E8E93' }}>
                  {wallet.address}
                </Text>
              </Box>
            </Box>
          </TouchableOpacity>
        ))}
      </Box>
    </ScrollView>
  );
};

export default RecipientStep;
