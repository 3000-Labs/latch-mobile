/**
 * cosign-review.tsx — backend-free multisig approval surface
 * (docs/multisig-p2p-cosign.md, steps 4–5).
 *
 * Opened with:
 *   - ?id=<packetId>   → load a locally-held packet (creator, or after import)
 *   - ?data=<json>     → import a packet received from another device
 * If neither resolves, shows a paste field to import a shared packet.
 *
 * Actions: Approve (sign this device's member entry), Share (export the packet
 * to the next signer), Submit (once threshold is met).
 */

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import {
  decodePacketParam,
  decodeTransferSummary,
  encodePacketParam,
  serializePacket,
  type CosignPacket,
  type TransferSummary,
} from '@/src/lib/cosign-packet';
import { importPacket } from '@/src/lib/cosign-packet-flow';
import { approve, canApprove, getEntry, submit } from '@/src/lib/cosign-transport';
import { friendlyTxError } from '@/src/lib/tx-errors';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const truncate = (s: string): string => (s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s);

// SAC base units use 7 decimals; render without trailing zeros.
function formatUnits(base: string): string {
  const neg = base.startsWith('-');
  const digits = (neg ? base.slice(1) : base).padStart(8, '0');
  const int = digits.slice(0, -7);
  const frac = digits.slice(-7).replace(/0+$/, '');
  return `${neg ? '-' : ''}${int}${frac ? `.${frac}` : ''}`;
}

const CosignReview = () => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { id, data, d } = useLocalSearchParams<{ id?: string; data?: string; d?: string }>();

  const [packet, setPacket] = useState<CosignPacket | null>(null);
  const [summary, setSummary] = useState<TransferSummary | null>(null);
  const [mayApprove, setMayApprove] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (p: CosignPacket) => {
    setPacket(p);
    try {
      setSummary(decodeTransferSummary(p));
      setError(null);
    } catch (e) {
      setSummary(null);
      setError(e instanceof Error ? e.message : 'Could not read transfer details');
    }
    canApprove(p)
      .then(setMayApprove)
      .catch(() => setMayApprove(false));
  };

  useEffect(() => {
    (async () => {
      try {
        if (d) {
          // latch://cosign?d=<base64url> deep link from "Share with next signer".
          apply(await importPacket(decodePacketParam(d)));
        } else if (data) {
          apply(await importPacket(data));
        } else if (id) {
          const p = await getEntry(id);
          if (p) apply(p);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load packet');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, data, d]);

  const handleImportPaste = async () => {
    setBusy(true);
    try {
      apply(await importPacket(pasteValue));
      setPasteValue('');
    } catch (e) {
      setError(friendlyTxError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!packet) return;
    setBusy(true);
    try {
      apply(await approve(packet.id));
    } catch (e) {
      setError(friendlyTxError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (!packet) return;
    try {
      // Prefer a tappable latch://cosign deep link that opens this screen
      // pre-loaded on the next signer's device. Fall back to the raw packet
      // blob if the link grows too long for some chat apps (large sig sets).
      const link = Linking.createURL('cosign', { queryParams: { d: encodePacketParam(packet) } });
      const message = link.length <= 7000 ? link : serializePacket(packet);
      await Share.share({ message });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const handleSubmit = async () => {
    if (!packet) return;
    setBusy(true);
    try {
      const { hash } = await submit(packet.id);
      Toast.show({ type: 'success', text1: 'Transfer submitted', text2: `${hash.slice(0, 10)}…` });
      router.replace('/(tabs)/history');
    } catch (e) {
      setError(friendlyTxError(e));
    } finally {
      setBusy(false);
    }
  };

  const thresholdMet = !!packet && packet.signatures.length >= packet.threshold;

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
          Approve transfer
        </Text>
      </Box>

      <Box flex={1} px="m">
        {loading ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <ActivityIndicator color={theme.colors.primary700} />
          </Box>
        ) : !packet ? (
          // No packet yet — offer paste import.
          <Box mt="l">
            <Text variant="p6" color="textPrimary" mb="s">
              Paste an approval packet
            </Text>
            <Text variant="p8" color="textSecondary" mb="m">
              Someone sharing a shared-wallet transfer can send you a packet. Paste it here to
              review and approve.
            </Text>
            <Box backgroundColor="bg11" borderRadius={14} p="s" mb="m">
              <TextInput
                value={pasteValue}
                onChangeText={setPasteValue}
                placeholder="{ ...packet json... }"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                style={{ color: theme.colors.textPrimary, minHeight: 120, fontSize: 12 }}
              />
            </Box>
            <Button
              label="Load packet"
              variant="primary"
              onPress={handleImportPaste}
              loading={busy}
              disabled={!pasteValue.trim()}
            />
            {error ? (
              <Text variant="p8" color="danger900" mt="m">
                {error}
              </Text>
            ) : null}
          </Box>
        ) : (
          <Box flex={1}>
            {/* Summary — derived from the signed bytes, never a sidecar field */}
            <Box backgroundColor="cardbg" borderRadius={20} p="m" mt="s" mb="m">
              {summary ? (
                <>
                  <Text variant="p7" color="textSecondary">
                    Amount
                  </Text>
                  <Text variant="title" color="textPrimary" mt="xs" mb="m">
                    {formatUnits(summary.amountBaseUnits)}
                  </Text>
                  <Row label="From (shared wallet)" value={truncate(summary.from)} />
                  <Row label="To" value={truncate(summary.to)} />
                  <Row label="Token (SAC)" value={truncate(summary.sacContractId)} />
                </>
              ) : (
                <Text variant="p7" color="danger900">
                  {error ?? 'Could not decode the transfer.'}
                </Text>
              )}
            </Box>

            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              backgroundColor="bg11"
              borderRadius={14}
              p="m"
              mb="m"
            >
              <Text variant="p6" color="textPrimary">
                Approvals
              </Text>
              <Text
                variant="p6"
                color={thresholdMet ? 'success900' : 'textSecondary'}
                style={{ fontWeight: '700' }}
              >
                {packet.signatures.length}/{packet.threshold}
              </Text>
            </Box>

            {error ? (
              <Text variant="p8" color="danger900" mb="m">
                {error}
              </Text>
            ) : null}

            <Box flex={1} />

            <Box style={{ paddingBottom: insets.bottom + 12 }}>
              {thresholdMet ? (
                <Button
                  label="Submit transfer"
                  variant="primary"
                  onPress={handleSubmit}
                  loading={busy}
                  mb="s"
                />
              ) : mayApprove ? (
                <Button
                  label="Approve"
                  variant="primary"
                  onPress={handleApprove}
                  loading={busy}
                  mb="s"
                />
              ) : (
                <Text variant="p8" color="textSecondary" textAlign="center" mb="s">
                  You&apos;ve approved. Share with the remaining members to reach the threshold.
                </Text>
              )}
              <Button
                label="Share with next signer"
                variant="outline"
                onPress={handleShare}
                disabled={busy}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box flexDirection="row" alignItems="center" justifyContent="space-between" py="xs">
    <Text variant="p7" color="textSecondary">
      {label}
    </Text>
    <Text variant="p7" color="textPrimary">
      {value}
    </Text>
  </Box>
);

export default CosignReview;
