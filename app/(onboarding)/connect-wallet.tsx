import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, ScrollView, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import LoadingBlur from '@/src/components/shared/LoadingBlur';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const wallets = [
  {
    key: 'freighter',
    title: 'Freighter',
    subtitle: 'Browser extension wallet for Stellar',
    url: 'https://freighter.app',
  },
  {
    key: 'albedo',
    title: 'Albedo',
    subtitle: 'Web-based wallet and signer for Stellar',
    url: 'https://albedo.link',
  },
  {
    key: 'xbull',
    title: 'xBull Wallet',
    subtitle: 'Multi-chain wallet with Stellar support',
    url: 'https://xbull.dev',
  },
  {
    key: 'rabet',
    title: 'Rabet',
    subtitle: 'Non-custodial Stellar wallet extension',
    url: 'https://rabet.io',
  },
];

const ConnectWallet = () => {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const router = useRouter();

  const [visible, setVisible] = React.useState(false);

  const openExternal = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style={statusBarStyle} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.m,
          paddingBottom: 40,
          paddingTop: 60,
        }}
      >
        <Box alignItems="center" mb="xxl">
          <Box flexDirection="row" width={'100%'} justifyContent="space-between" mb="m">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>

            <Image
              source={require('@/src/assets/images/logosym.png')}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
            <Box width={40} />
          </Box>

          <Text variant="h7" mt="m" fontSize={32} textAlign="center">
            Connect Your Wallet
          </Text>

          <Text variant="p5" color="textSecondary" mt="xs" textAlign="center" width={'85%'}>
            Choose a wallet to connect to your Smart Account.
          </Text>
        </Box>

        <Box gap="m">
          {wallets.map((w) => (
            <TouchableOpacity key={w.key} onPress={() => openExternal(w.url)} activeOpacity={0.8}>
              <Box
                padding="m"
                borderRadius={12}
                backgroundColor={statusBarStyle !== 'dark' ? 'bg900' : 'text500'}
                borderWidth={1}
                borderColor="gray800"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Text variant="h10" color="textPrimary" fontWeight="600">
                    {w.title}
                  </Text>
                  <Text variant="p7" color="textSecondary">
                    {w.subtitle}
                  </Text>
                </Box>

                <Ionicons name="open-outline" size={20} color={theme.colors.textSecondary} />
              </Box>
            </TouchableOpacity>
          ))}
        </Box>
      </ScrollView>
      <Box mb="xl" alignItems="center">
        <TouchableOpacity onPress={() => router.push('/(onboarding)/get-started')}>
          <Text variant="body" color="textSecondary">
            Don’t have a Stellar Wallet?{' '}
            <Text variant="body" color="primary600" fontWeight="600">
              Create a new account
            </Text>
          </Text>
        </TouchableOpacity>
      </Box>
      <LoadingBlur visible={visible} />
    </Box>
  );
};

export default ConnectWallet;
