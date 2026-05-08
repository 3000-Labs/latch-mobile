import { TOKENS } from '@/src/components/send-token/types';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, ScrollView, TextInput, TouchableOpacity } from 'react-native';

const ReceiveToken = () => {
  const theme = useTheme<Theme>();

  return (
    <Box
      flex={1}
      backgroundColor="cardbg"
      style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}
    >
      <StatusBar style="light" />

      {/* Bottom Sheet Handle */}
      <Box alignItems="center" pt="m">
        <Box width={36} height={4} borderRadius={2} backgroundColor="gray800" />
      </Box>

      {/* Header */}
      <Box
        height={56}
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="m"
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text variant="h10" color="textPrimary" fontWeight="700">
          Select Token
        </Text>
        <TouchableOpacity>
          <Ionicons name="scan-outline" size={22} color={theme.colors.white} />
        </TouchableOpacity>
      </Box>

      {/* Search Bar */}
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

      {/* Token List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {TOKENS.map((token) => (
          <TouchableOpacity key={token.id} activeOpacity={0.7}>
            <Box
              flexDirection="row"
              alignItems="center"
              backgroundColor="bg11"
              borderRadius={16}
              padding="m"
              mb="s"
              height={82}
            >
              {/* Token Icon */}
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

              {/* Token Info */}
              <Box flex={1}>
                <Text variant="h10" color="textPrimary" fontWeight="700" mb="xs">
                  {token.name}
                </Text>
                <Box flexDirection="row" alignItems="center">
                  <Text
                    variant="captionSemibold"
                    color="textSecondary"
                    style={{ letterSpacing: 0.5 }}
                  >
                    BALANCE{' '}
                  </Text>
                  <Text variant="captionBold" color="textPrimary" style={{ letterSpacing: 0.5 }}>
                    {token.balance} {token.symbol}
                  </Text>
                </Box>
              </Box>

              {/* Actions */}
              <Box flexDirection="row" alignItems="center" gap="m">
                <TouchableOpacity>
                  <Ionicons name="qr-code-outline" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="copy-outline" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </Box>
            </Box>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* <LoadingBlur
              visible={status === 'sending'}
              text="Sending..."
              subText={'0.000345SOL to Crownz Wallet \n{0xE643...e16c} '}
            /> */}
    </Box>
  );
};

export default ReceiveToken;
