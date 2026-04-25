import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { useStellarTransactions, StellarPayment } from '@/src/hooks/use-stellar-transactions';
import { useSmartAccountTransaction } from '@/src/hooks/use-smart-account-transaction';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Horizon } from '@stellar/stellar-sdk';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-6)}`;

const formatXLM = (raw: string) =>
  parseFloat(raw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getDirection(payment: StellarPayment, gAddress: string): 'received' | 'sent' | 'created' {
  if (payment.type === 'create_account' && payment.to === gAddress) return 'created';
  if (payment.from === gAddress) return 'sent';
  return 'received';
}

function TransactionRow({
  payment,
  gAddress,
  surfaceBg,
}: {
  payment: StellarPayment;
  gAddress: string;
  surfaceBg: string;
}) {
  const theme = useTheme<Theme>();
  const direction = getDirection(payment, gAddress);
  const isSent = direction === 'sent';
  const assetLabel = payment.assetType === 'native' ? 'XLM' : (payment.assetCode ?? 'Unknown');
  const counterparty = isSent ? payment.to : payment.from;
  const amountColor = isSent ? theme.colors.danger600 : theme.colors.success600;
  const amountPrefix = isSent ? '-' : '+';
  const iconName = direction === 'created' ? 'star' : isSent ? 'arrow-up' : 'arrow-down';
  const iconBg = isSent ? theme.colors.danger800 : theme.colors.success50;
  const iconColor = isSent ? theme.colors.danger600 : theme.colors.success700;

  const handlePress = () => {
    router.push({
      pathname: '/transaction/[id]',
      params: {
        id: payment.id,
        hash: payment.transactionHash,
        type: payment.type,
        from: payment.from,
        to: payment.to,
        amount: payment.amount,
        assetType: payment.assetType,
        assetCode: payment.assetCode ?? '',
        createdAt: payment.createdAt,
        direction,
        gAddress,
      },
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Box
        flexDirection="row"
        alignItems="center"
        paddingVertical="m"
        paddingHorizontal="m"
        gap="m"
        style={{ backgroundColor: surfaceBg, borderRadius: 14, marginBottom: 8 }}
      >
        <Box
          width={42}
          height={42}
          borderRadius={21}
          alignItems="center"
          justifyContent="center"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name={iconName} size={18} color={iconColor} />
        </Box>

        <Box flex={1}>
          <Text variant="h11" color="textPrimary" numberOfLines={1}>
            {direction === 'created' ? 'Account Funded' : isSent ? 'Sent' : 'Received'}{' '}
            {assetLabel}
          </Text>
          <Text variant="p8" color="textSecondary" numberOfLines={1} style={{ marginTop: 2 }}>
            {truncateAddress(counterparty)}
          </Text>
        </Box>

        <Box alignItems="flex-end">
          <Text variant="h11" style={{ color: amountColor }}>
            {amountPrefix}
            {formatXLM(payment.amount)} {assetLabel}
          </Text>
          <Text variant="p8" color="textSecondary" style={{ marginTop: 2 }}>
            {format(new Date(payment.createdAt), 'MMM d')}
          </Text>
        </Box>

        <Ionicons name="chevron-forward" size={14} color={theme.colors.gray600} />
      </Box>
    </TouchableOpacity>
  );
}

const Home = () => {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();

  // ── Wallet store ──────────────────────────────────────────────────────────
  const { activeWallet, smartAccountAddress, rehydrateWallet } = useWalletStore();

  // Rehydrate from SecureStore on first mount (idempotent after first call)
  useEffect(() => { rehydrateWallet(); }, [rehydrateWallet]);

  const gAddress = activeWallet?.gAddress ?? null;

  // ── Smart-account transaction ─────────────────────────────────────────────
  const { txState, txHash, txError, isBusy, execute, reset } = useSmartAccountTransaction();

  const handleSignTransaction = async () => {
    if (!smartAccountAddress || !activeWallet) {
      Alert.alert('Not ready', 'Smart account not found. Complete onboarding first.');
      return;
    }
    try {
      await execute(
        smartAccountAddress,
        activeWallet.publicKeyHex,
        activeWallet.keypair,
      );
    } catch { /* error is set in hook state */ }
  };

  useEffect(() => {
    if (txState === 'success' && txHash) {
      Alert.alert(
        'Transaction confirmed ✓',
        `Hash: ${txHash.slice(0, 16)}…${txHash.slice(-8)}`,
        [{ text: 'OK', onPress: reset }],
      );
    }
    if (txState === 'error' && txError) {
      Alert.alert('Transaction failed', txError, [{ text: 'OK', onPress: reset }]);
    }
  }, [txState, txHash, txError, reset]);

  const [addressCopied, setAddressCopied] = useState(false);
  const [smartCopied, setSmartCopied] = useState(false);

  const {
    data: account,
    isLoading: balanceLoading,
    isError,
    refetch: refetchBalance,
    isRefetching: isRefetchingBalance,
  } = useQuery({
    queryKey: ['stellar-account', gAddress],
    queryFn: async () => {
      const server = new Horizon.Server(HORIZON_URL);
      return server.accounts().accountId(gAddress!).call();
    },
    enabled: !!gAddress,
    retry: 1,
    staleTime: 30_000,
  });

  const {
    data: transactions,
    isLoading: txLoading,
    refetch: refetchTx,
    isRefetching: isRefetchingTx,
  } = useStellarTransactions(gAddress);

  const xlmBalance = account?.balances?.find((b) => b.asset_type === 'native')?.balance ?? null;

  const handleCopyAddress = async () => {
    if (!gAddress) return;
    await Clipboard.setStringAsync(gAddress);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const handleCopySmartAccount = async () => {
    if (!smartAccountAddress) return;
    await Clipboard.setStringAsync(smartAccountAddress);
    setSmartCopied(true);
    setTimeout(() => setSmartCopied(false), 2000);
  };

  const handleRefresh = () => {
    refetchBalance();
    refetchTx();
  };

  const cardBg = theme.colors.primary700;
  const surfaceBg = statusBarStyle !== 'light' ? theme.colors.text50 : theme.colors.gray900;
  const recentTx = transactions?.slice(0, 5) ?? [];

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style={statusBarStyle} />
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingBalance || isRefetchingTx}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary700}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.m,
          paddingBottom: 120,
          paddingTop: 60,
        }}
      >
        {/* Header */}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="xl">
          <Image
            source={require('@/src/assets/images/logosym.png')}
            style={{ width: 35, height: 35 }}
            resizeMode="contain"
          />
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </Box>

        {/* Balance Card */}
        <Box borderRadius={24} padding="xl" mb="l" style={{ backgroundColor: cardBg }}>
          <Text variant="body" style={{ color: 'rgba(0,0,0,0.6)', marginBottom: 4 }}>
            Total Balance
          </Text>

          {balanceLoading || !gAddress ? (
            <ActivityIndicator
              color="black"
              size="small"
              style={{ alignSelf: 'flex-start', marginVertical: 8 }}
            />
          ) : isError || xlmBalance === null ? (
            <Box>
              <Text variant="h7" style={{ color: '#000' }}>
                0.00 XLM
              </Text>
              <Text variant="caption" style={{ color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>
                Account not yet funded
              </Text>
            </Box>
          ) : (
            <Text variant="h6" style={{ color: '#000', fontWeight: '800' }}>
              {formatXLM(xlmBalance)} XLM
            </Text>
          )}

          {/* Address pill */}
          {gAddress && (
            <TouchableOpacity
              onPress={handleCopyAddress}
              activeOpacity={0.7}
              style={{ marginTop: 20 }}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                gap="xs"
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(0,0,0,0.18)',
                  borderRadius: 100,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
                  {truncateAddress(gAddress)}
                </Text>
                <Ionicons
                  name={addressCopied ? 'checkmark' : 'copy-outline'}
                  size={13}
                  color="#fff"
                />
              </Box>
            </TouchableOpacity>
          )}
        </Box>

        {/* Action Buttons */}
        <Box flexDirection="row" gap="m" mb="xl">
          {(['Send', 'Receive', 'Swap'] as const).map((label) => {
            const icon =
              label === 'Send'
                ? 'arrow-up'
                : label === 'Receive'
                  ? 'arrow-down'
                  : 'swap-horizontal';
            return (
              <TouchableOpacity key={label} style={{ flex: 1 }} activeOpacity={0.75}>
                <Box
                  borderRadius={16}
                  padding="m"
                  alignItems="center"
                  gap="xs"
                  style={{ backgroundColor: surfaceBg }}
                >
                  <Ionicons name={icon} size={22} color={theme.colors.primary700} />
                  <Text variant="caption" color="textPrimary" fontWeight="600">
                    {label}
                  </Text>
                </Box>
              </TouchableOpacity>
            );
          })}
        </Box>

        {/* Smart Account Card */}
        {smartAccountAddress && (
          <Box
            borderRadius={16}
            padding="l"
            mb="xl"
            gap="m"
            style={{ backgroundColor: surfaceBg }}
          >
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
              <Text variant="h11" color="textPrimary" fontWeight="700">
                Smart Account
              </Text>
              <Box
                paddingHorizontal="s"
                paddingVertical="xs"
                borderRadius={8}
                style={{ backgroundColor: theme.colors.primary700 + '22' }}
              >
                <Text variant="caption" color="primary700" fontWeight="700">
                  Testnet
                </Text>
              </Box>
            </Box>

            {/* C-address */}
            <TouchableOpacity onPress={handleCopySmartAccount} activeOpacity={0.7}>
              <Box
                flexDirection="row"
                alignItems="center"
                gap="xs"
                padding="m"
                borderRadius={10}
                style={{ backgroundColor: theme.colors.primary700 + '11' }}
              >
                <Text variant="caption" color="primary700" style={{ flex: 1 }} numberOfLines={1}>
                  {truncateAddress(smartAccountAddress)}
                </Text>
                <Ionicons
                  name={smartCopied ? 'checkmark' : 'copy-outline'}
                  size={14}
                  color={theme.colors.primary700}
                />
              </Box>
            </TouchableOpacity>

            {/* Sign Transaction Button */}
            <TouchableOpacity
              onPress={handleSignTransaction}
              disabled={isBusy}
              activeOpacity={0.8}
              style={{
                backgroundColor: isBusy
                  ? theme.colors.gray900
                  : theme.colors.primary700,
                borderRadius: 12,
                padding: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                opacity: isBusy ? 0.7 : 1,
              }}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="flash" size={16} color="#000" />
              )}
              <Text variant="caption" style={{ color: '#000', fontWeight: '700' }}>
                {txState === 'building'
                  ? 'Building tx…'
                  : txState === 'signing'
                    ? 'Signing…'
                    : txState === 'submitting'
                      ? 'Submitting…'
                      : 'Sign Transaction'}
              </Text>
            </TouchableOpacity>
          </Box>
        )}

        {/* Recent Transactions */}
        <Box mb="m">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
            <Text variant="h10" color="textPrimary">
              Recent Transactions
            </Text>
            {(transactions?.length ?? 0) > 5 && (
              <TouchableOpacity activeOpacity={0.7}>
                <Text variant="caption" color="primary700">
                  See all
                </Text>
              </TouchableOpacity>
            )}
          </Box>

          {txLoading && gAddress ? (
            <Box
              borderRadius={16}
              padding="xl"
              alignItems="center"
              style={{ backgroundColor: surfaceBg }}
            >
              <ActivityIndicator color={theme.colors.primary700} />
            </Box>
          ) : recentTx.length === 0 ? (
            <Box
              borderRadius={16}
              padding="xl"
              alignItems="center"
              gap="m"
              style={{ backgroundColor: surfaceBg }}
            >
              <Ionicons name="receipt-outline" size={36} color={theme.colors.gray600} />
              <Text variant="body" color="textSecondary" textAlign="center">
                No transactions yet
              </Text>
            </Box>
          ) : (
            <Box>
              {recentTx.map((payment) => (
                <TransactionRow
                  key={payment.id}
                  payment={payment}
                  gAddress={gAddress!}
                  surfaceBg={surfaceBg}
                />
              ))}
            </Box>
          )}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default Home;
