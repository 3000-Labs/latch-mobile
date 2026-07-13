import DappHeader from '@/src/components/walletconnect/DappHeader';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { WC_CHAIN, approveProposal, rejectProposal } from '@/src/lib/walletconnect';
import { useWalletStore } from '@/src/store/wallet';
import { useWalletConnectStore } from '@/src/store/walletconnect';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WCSessionProposalScreen() {
  const insets = useSafeAreaInsets();
  const { pendingProposal, setPendingProposal, setActiveSessions } = useWalletConnectStore();
  const { smartAccountAddress } = useWalletStore();
  const [loading, setLoading] = useState(false);

  if (!pendingProposal) {
    router.back();
    return null;
  }

  const { proposer } = pendingProposal.params;
  const meta = proposer.metadata;
  const icon = meta.icons?.[0];

  const requiredChains = Object.values(pendingProposal.params.requiredNamespaces ?? {}).flatMap(
    (ns: any) => ns.chains ?? [],
  );
  const chainMismatch = requiredChains.length > 0 && !requiredChains.includes(WC_CHAIN);
  const requiredNetwork = requiredChains
    .find((c: string) => c.startsWith('stellar:'))
    ?.split(':')[1]
    ?.toUpperCase();

  const handleApprove = async () => {
    if (!smartAccountAddress) {
      Alert.alert('No wallet', 'No smart account found.');
      return;
    }
    setLoading(true);
    try {
      await approveProposal(pendingProposal, smartAccountAddress);
      // Refresh session list
      const { getActiveSessions } = await import('@/src/lib/walletconnect');
      setActiveSessions(getActiveSessions());
      setPendingProposal(null);
      router.back();
    } catch (e: any) {
      Alert.alert('Connection failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      await rejectProposal(pendingProposal.id);
    } catch {
      // best-effort
    }
    setPendingProposal(null);
    router.back();
  };

  return (
    <Box
      flex={1}
      backgroundColor="mainBackground"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      <StatusBar style="light" />

      <Box flex={1} paddingHorizontal="xl" justifyContent="center" alignItems="center">
        <DappHeader name={meta.name} url={meta.url} icon={icon} />

        <Box
          backgroundColor="cardBackground"
          borderRadius={16}
          padding="m"
          width="100%"
          mb="xl"
        >
          <Text variant="p7" color="textSecondary" mb="s">
            Wallet
          </Text>
          <Text variant="p6" color="textPrimary" fontFamily="SFproMedium" numberOfLines={1}>
            {smartAccountAddress
              ? `${smartAccountAddress.slice(0, 8)}…${smartAccountAddress.slice(-8)}`
              : 'No wallet'}
          </Text>
        </Box>

        {chainMismatch && (
          <Box
            backgroundColor="inputError"
            borderRadius={12}
            padding="m"
            width="100%"
            mb="m"
            style={{ opacity: 0.9 }}
          >
            <Text variant="p7" color="textWhite" fontFamily="SFproMedium" mb="xs">
              Network mismatch
            </Text>
            <Text variant="p8" color="textWhite">
              This dApp requires Stellar {requiredNetwork ?? 'Mainnet'}. Your wallet is on{' '}
              {WC_CHAIN === 'stellar:testnet' ? 'Testnet' : 'Mainnet'}. Reject and reconnect with a
              matching build.
            </Text>
          </Box>
        )}

        <Text variant="p7" color="textSecondary" textAlign="center">
          This dApp is requesting permission to view your address and request transaction
          signatures.
        </Text>
      </Box>

      <Box paddingHorizontal="xl" gap="s">
        <Button label="Connect" onPress={handleApprove} loading={loading} disabled={chainMismatch} />
        <Button
          label="Reject"
          onPress={handleReject}
          variant="outline"
          disabled={loading}
        />
      </Box>
    </Box>
  );
}
