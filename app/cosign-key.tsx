/**
 * latch://cosign-key?account=<C>&wck=<hex> — bootstrap a shared wallet's
 * encryption key (WCK) to a member (docs/multisig-encrypted-queue.md, step 2).
 *
 * Two modes:
 *   - import  (?account & ?wck): verify this device is a signer on <account>
 *     on-chain, then cache the WCK. A stray/forged link can't plant a key for a
 *     wallet you're not in.
 *   - share   (?account only): the creator hands the wallet's key to a member by
 *     producing the link above — send ONLY to real members over a trusted channel.
 */

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { friendlyTxError } from '@/src/lib/tx-errors';
import {
  encodeWck,
  getWalletCosignKey,
  importWalletCosignKey,
} from '@/src/lib/wallet-cosign-key';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Status = 'verifying' | 'success' | 'error' | 'share';

const truncate = (s: string): string => (s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s);

const CosignKey = () => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { account, wck } = useLocalSearchParams<{ account?: string; wck?: string }>();

  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState<string | null>(null);
  const [shareKey, setShareKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (account && wck) {
        setStatus('verifying');
        try {
          await importWalletCosignKey(account, wck);
          setStatus('success');
        } catch (e) {
          setMessage(friendlyTxError(e));
          setStatus('error');
        }
      } else if (account) {
        const key = await getWalletCosignKey(account);
        if (key) {
          setShareKey(encodeWck(key));
          setStatus('share');
        } else {
          setMessage('No saved key for this wallet on this device.');
          setStatus('error');
        }
      } else {
        setMessage('Open this from a shared-wallet key link.');
        setStatus('error');
      }
    })();
  }, [account, wck]);

  const handleShare = async () => {
    if (!account || !shareKey) return;
    try {
      const link = Linking.createURL('cosign-key', { queryParams: { account, wck: shareKey } });
      await Share.share({ message: link });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <Box flex={1} backgroundColor="mainBackground" style={{ paddingTop: insets.top }}>
      <LinearGradient
        colors={[theme.colors.gradientLight, theme.colors.gradientDark]}
        locations={[0, 0.2772]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Box flexDirection="row" alignItems="center" px="m" py="s">
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="headline" color="textPrimary" ml="s">
          Wallet key
        </Text>
      </Box>

      <Box flex={1} px="m" justifyContent="center" alignItems="center">
        {status === 'verifying' ? (
          <>
            <ActivityIndicator color={theme.colors.primary700} />
            <Text variant="p7" color="textSecondary" mt="m">
              Verifying membership…
            </Text>
          </>
        ) : status === 'success' ? (
          <Box alignItems="center">
            <Ionicons name="shield-checkmark" size={48} color={theme.colors.success900} />
            <Text variant="h10" color="textPrimary" fontWeight="700" mt="m" mb="xs" textAlign="center">
              Wallet key saved
            </Text>
            <Text variant="p7" color="textSecondary" textAlign="center" mb="l">
              This device can now send and receive encrypted approvals for this shared wallet.
            </Text>
            <Box width="100%">
              <Button label="Done" variant="primary" onPress={() => router.back()} />
            </Box>
          </Box>
        ) : status === 'share' ? (
          <Box alignItems="center" width="100%">
            <Ionicons name="key" size={48} color={theme.colors.primary} />
            <Text variant="h10" color="textPrimary" fontWeight="700" mt="m" mb="xs" textAlign="center">
              Share this wallet&apos;s key
            </Text>
            <Text variant="p7" color="textSecondary" textAlign="center" mb="s">
              Send the key link only to members of {truncate(account ?? '')}, over a channel you
              trust. It lets them decrypt this wallet&apos;s pending approvals — the server never
              sees it.
            </Text>
            <Text variant="p8" color="danger900" textAlign="center" mb="l">
              Anyone you send this to who is a signer can read this wallet&apos;s transfers.
            </Text>
            <Box width="100%">
              <Button label="Share wallet key" variant="primary" onPress={handleShare} />
            </Box>
          </Box>
        ) : (
          <Box alignItems="center">
            <Ionicons name="alert-circle" size={48} color={theme.colors.danger900} />
            <Text variant="p7" color="textSecondary" textAlign="center" mt="m" mb="l">
              {message ?? 'Something went wrong.'}
            </Text>
            <Box width="100%">
              <Button label="Close" variant="outline" onPress={() => router.back()} />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CosignKey;
