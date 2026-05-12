import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Horizon } from '@stellar/stellar-sdk';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HORIZON_URL = process.env.EXPO_PUBLIC_HORIZON_URL || '';

// const truncate = (addr: string, chars = 12) =>
//   addr.length > chars * 2 + 3 ? `${addr.slice(0, chars)}...${addr.slice(-chars)}` : addr;

function CopyableField({ label, value }: { label: string; value: string }) {
  const theme = useTheme<Theme>();
  const [copied, setCopied] = useState(false);
  const surfaceBg = useStatusBarStyle() !== 'light' ? theme.colors.text50 : theme.colors.gray900;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box mb="m">
      <Text variant="caption" color="textSecondary" mb="xs">
        {label}
      </Text>
      <Box
        flexDirection="row"
        alignItems="center"
        gap="s"
        borderRadius={12}
        padding="m"
        style={{ backgroundColor: surfaceBg }}
      >
        <Text variant="p7" color="textPrimary" flex={1} numberOfLines={2}>
          {value}
        </Text>
        <TouchableOpacity
          onPress={handleCopy}
          activeOpacity={0.7}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={16}
            color={theme.colors.primary700}
          />
        </TouchableOpacity>
      </Box>
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme<Theme>();
  const surfaceBg = useStatusBarStyle() !== 'light' ? theme.colors.text50 : theme.colors.gray900;

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingVertical="m"
      paddingHorizontal="m"
      mb="s"
      borderRadius={12}
      style={{ backgroundColor: surfaceBg }}
    >
      <Text variant="p7" color="textSecondary">
        {label}
      </Text>
      <Text variant="h11" color="textPrimary" style={{ maxWidth: '55%' }} numberOfLines={1}>
        {value}
      </Text>
    </Box>
  );
}

export default function TransactionDetail() {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const params = useLocalSearchParams<{
    id: string;
    hash: string;
    type: string;
    from: string;
    to: string;
    amount: string;
    assetType: string;
    assetCode: string;
    createdAt: string;
    direction: 'sent' | 'received' | 'created';
    gAddress: string;
  }>();

  const { hash, from, to, amount, assetType, assetCode, createdAt, direction } = params;
  const isSent = direction === 'sent';
  const assetLabel = assetType === 'native' ? 'XLM' : assetCode || 'Unknown';

  const amountColor = isSent ? theme.colors.danger600 : theme.colors.success600;
  const amountPrefix = isSent ? '-' : '+';
  const iconName = direction === 'created' ? 'star' : isSent ? 'arrow-up' : 'arrow-down';
  const iconBg = isSent ? theme.colors.danger800 : theme.colors.success50;
  const iconColor = isSent ? theme.colors.danger600 : theme.colors.success700;

  const directionLabel = direction === 'created' ? 'Account Funded' : isSent ? 'Sent' : 'Received';

  const { data: memo, isLoading: memoLoading } = useQuery({
    queryKey: ['stellar-tx-memo', hash],
    queryFn: async () => {
      const server = new Horizon.Server(HORIZON_URL);
      const tx = await server.transactions().transaction(hash).call();
      return tx.memo && tx.memo !== 'none' ? tx.memo : null;
    },
    staleTime: Infinity,
    retry: 1,
  });

  const formattedDate = createdAt ? format(new Date(createdAt), "MMM d, yyyy 'at' h:mm a") : '—';

  const explorerUrl = `${process.env.EXPO_PUBLIC_EXPLORER_URL || ''}/tx/${hash}`;

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style={statusBarStyle} />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: theme.spacing.m }}>
        <Box flexDirection="row" alignItems="center">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="h10" color="textPrimary" style={{ marginLeft: theme.spacing.m }}>
            Transaction Details
          </Text>
        </Box>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 90,
            paddingTop: theme.spacing.xl,
          }}
        >
          {/* Amount Hero */}
          <Box alignItems="center" mb="xl">
            <Box
              width={72}
              height={72}
              borderRadius={36}
              alignItems="center"
              justifyContent="center"
              mb="m"
              style={{ backgroundColor: iconBg }}
            >
              <Ionicons name={iconName} size={32} color={iconColor} />
            </Box>
            <Text variant="caption" color="textSecondary" mb="xs">
              {directionLabel}
            </Text>
            <Text variant="h7" style={{ color: amountColor }}>
              {amountPrefix}
              {parseFloat(amount).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 7,
              })}{' '}
              {assetLabel}
            </Text>
            <Text variant="p8" color="textSecondary" style={{ marginTop: 6 }}>
              {formattedDate}
            </Text>
          </Box>

          {/* Details */}
          <Text variant="h11" color="textSecondary" mb="s">
            DETAILS
          </Text>

          <CopyableField label="From" value={from} />
          <CopyableField label="To" value={to} />

          <InfoRow label="Asset" value={assetLabel} />
          <InfoRow label="Status" value="Confirmed" />

          {memoLoading ? (
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              paddingVertical="m"
              paddingHorizontal="m"
              mb="s"
              borderRadius={12}
              style={{
                backgroundColor:
                  statusBarStyle !== 'light' ? theme.colors.text50 : theme.colors.gray900,
              }}
            >
              <Text variant="p7" color="textSecondary">
                Memo
              </Text>
              <ActivityIndicator size="small" color={theme.colors.gray600} />
            </Box>
          ) : memo ? (
            <InfoRow label="Memo" value={memo} />
          ) : null}

          {/* Transaction Hash */}
          <Text variant="h11" color="textSecondary" mb="s" style={{ marginTop: theme.spacing.m }}>
            TRANSACTION HASH
          </Text>
          <CopyableField label="" value={hash} />

          {/* Explorer Link */}
          <Button
            label="View on Sstellar Explorer"
            onPress={() => Linking.openURL(explorerUrl)}
            leftIcon={<Ionicons name="open-outline" size={16} color={theme.colors.primary700} />}
            mt="m"
          />
        </ScrollView>
      </SafeAreaView>
    </Box>
  );
}
