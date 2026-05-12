import React from 'react';
import { Image, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { TOKENS, Token } from './types';

interface Props {
  onSelectToken: (token: Token) => void;
}

const TokenSelectionStep = ({ onSelectToken }: Props) => {
  const theme = useTheme<Theme>();
  return (
    <>
      <Box paddingHorizontal="m" mt="s" mb="m">
        <Box
          flexDirection="row"
          alignItems="center"
          backgroundColor="bg900"
          borderRadius={14}
          paddingHorizontal="m"
          height={48}
          borderWidth={1}
          borderColor="gray900"
        >
          <TextInput
            placeholder="Search for tokens..."
            placeholderTextColor={theme.colors.textSecondary}
            style={{
              flex: 1,
              color: theme.colors.textPrimary,
              fontSize: 15,
              fontFamily: 'SFproRegular',
            }}
          />
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        </Box>
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {TOKENS.map((token) => (
          <TouchableOpacity key={token.id} activeOpacity={0.7} onPress={() => onSelectToken(token)}>
            <Box
              flexDirection="row"
              alignItems="center"
              backgroundColor="bg11"
              borderRadius={16}
              padding="m"
              mb="s"
              height={82}
            >
              <Box
                width={44}
                height={44}
                borderRadius={12}
                backgroundColor="black"
                justifyContent="center"
                alignItems="center"
                mr="m"
              >
                <Image
                  source={token.icon}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                />
              </Box>
              <Box flex={1}>
                <Text variant="h10" color="textPrimary" fontWeight="700" mb="xs">
                  {token.name}
                </Text>
                <Box flexDirection="row" alignItems="center">
                  <Text variant="captionSemibold" color="textSecondary" style={{ letterSpacing: 0.5 }}>
                    BALANCE{' '}
                  </Text>
                  <Text variant="captionBold" color="textPrimary" style={{ letterSpacing: 0.5 }}>
                    {token.balance} {token.symbol}
                  </Text>
                </Box>
              </Box>
            </Box>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
};

export default TokenSelectionStep;
