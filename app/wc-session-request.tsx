import DappHeader from '@/src/components/walletconnect/DappHeader';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { approveSignRequest, rejectSignRequest, walletKit } from '@/src/lib/walletconnect';
import { SECURE_KEYS, useWalletStore } from '@/src/store/wallet';
import { useWalletConnectStore } from '@/src/store/walletconnect';
import { confirmAuth } from '@/src/utils/confirm-auth';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WCSessionRequestScreen() {
  const insets = useSafeAreaInsets();
  const { pendingRequest, setPendingRequest } = useWalletConnectStore();
  const { activeAccountIndex } = useWalletStore();
  const [loading, setLoading] = useState(false);

  if (!pendingRequest || !walletKit) {
    router.back();
    return null;
  }

  const sessions = walletKit.getActiveSessions();
  const session = sessions[pendingRequest.topic];
  const meta = session?.peer.metadata;
  const method = pendingRequest.params.request.method;
  const { xdr } = pendingRequest.params.request.params as { xdr: string };

  const handleApprove = async () => {
    const authed = await confirmAuth('Authenticate to sign transaction');
    if (!authed) return;

    setLoading(true);
    try {
      const mnemonic = await SecureStore.getItemAsync(SECURE_KEYS.MNEMONIC);
      if (!mnemonic) throw new Error('No mnemonic found');
      await approveSignRequest(pendingRequest, mnemonic, activeAccountIndex);
      setPendingRequest(null);
      router.back();
    } catch (e: any) {
      Alert.alert('Signing failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      await rejectSignRequest(pendingRequest);
    } catch {
      // best-effort
    }
    setPendingRequest(null);
    router.back();
  };

  return (
    <Box
      flex={1}
      backgroundColor="mainBackground"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      <StatusBar style="light" />

      <Box flex={1} paddingHorizontal="xl">
        <Box alignItems="center" mt="xl" mb="l">
          {meta && (
            <DappHeader name={meta.name} url={meta.url} icon={meta.icons?.[0]} />
          )}
          <Text variant="h10" color="textPrimary" fontFamily="SFproSemibold" textAlign="center">
            {method === 'stellar_signAndSubmitXDR' ? 'Sign & Submit' : 'Sign Transaction'}
          </Text>
          <Text variant="p7" color="textSecondary" textAlign="center" mt="xs">
            {method === 'stellar_signAndSubmitXDR'
              ? 'This dApp wants to sign and submit a transaction on your behalf.'
              : 'This dApp wants you to sign a transaction.'}
          </Text>
        </Box>

        <Box backgroundColor="cardBackground" borderRadius={16} padding="m" mb="l">
          <Text variant="p7" color="textSecondary" mb="xs">
            Transaction XDR
          </Text>
          <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
            <Text variant="p7" color="textPrimary" style={{ fontFamily: 'monospace' }}>
              {xdr}
            </Text>
          </ScrollView>
        </Box>
      </Box>

      <Box paddingHorizontal="xl" gap="s">
        <Button label="Approve" onPress={handleApprove} loading={loading} />
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
