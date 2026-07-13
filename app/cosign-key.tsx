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
import { registerPushToken } from '@/src/lib/push-registration';
import { friendlyTxError } from '@/src/lib/tx-errors';
import {
  buildWckBundleForMembers,
  importWalletCosignKey,
  importWalletCosignKeyFromBundle,
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
  const { account, wck, bundle } = useLocalSearchParams<{
    account?: string;
    wck?: string;
    bundle?: string;
  }>();

  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState<string | null>(null);
  const [shareBundle, setShareBundle] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    (async () => {
      if (account && bundle) {
        // Sealed-bundle import: open this device's entry.
        setStatus('verifying');
        try {
          await importWalletCosignKeyFromBundle(account, bundle);
          // Holding the key unlocks this wallet's blind queue — register for
          // its approval pushes right away (fire-and-forget).
          registerPushToken().catch(() => {});
          setStatus('success');
        } catch (e) {
          setMessage(friendlyTxError(e));
          setStatus('error');
        }
      } else if (account && wck) {
        // Legacy raw-key import (pre-bundle links).
        setStatus('verifying');
        try {
          await importWalletCosignKey(account, wck);
          registerPushToken().catch(() => {});
          setStatus('success');
        } catch (e) {
          setMessage(friendlyTxError(e));
          setStatus('error');
        }
      } else if (account) {
        // Share mode: seal the key to every member and build one link.
        try {
          const built = await buildWckBundleForMembers(account);
          setShareBundle(built.bundle);
          setRecipientCount(built.recipientCount);
          setStatus('share');
        } catch (e) {
          setMessage(friendlyTxError(e));
          setStatus('error');
        }
      } else {
        setMessage('Open this from a shared-wallet key link.');
        setStatus('error');
      }
    })();
  }, [account, wck, bundle]);

  const handleShare = async () => {
    if (!account || !shareBundle) return;
    try {
      const link = Linking.createURL('cosign-key', { queryParams: { account, bundle: shareBundle } });
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
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={12}
        >
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
            <Text
              variant="h10"
              color="textPrimary"
              fontWeight="700"
              mt="m"
              mb="xs"
              textAlign="center"
            >
              Wallet key saved
            </Text>
            <Text variant="p7" color="textSecondary" textAlign="center" mb="l">
              This device can now send and receive encrypted approvals for this multisig wallet.
            </Text>
            <Box width="100%">
              <Button
                label="Done"
                variant="primary"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              />
            </Box>
          </Box>
        ) : status === 'share' ? (
          <Box alignItems="center" width="100%">
            <Ionicons name="key" size={48} color={theme.colors.primary} />
            <Text
              variant="h10"
              color="textPrimary"
              fontWeight="700"
              mt="m"
              mb="xs"
              textAlign="center"
            >
              Share this wallet&apos;s key
            </Text>
            <Text variant="p7" color="textSecondary" textAlign="center" mb="s">
              This link is sealed to the {recipientCount} member
              {recipientCount === 1 ? '' : 's'} of {truncate(account ?? '')} — only their devices
              can open it, so you can send it over any channel. The server never sees the key.
            </Text>
            <Text variant="p8" color="textSecondary" textAlign="center" mb="l">
              It unlocks this wallet&apos;s encrypted approvals on each member&apos;s device.
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
              <Button
                label="Close"
                variant="outline"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CosignKey;
