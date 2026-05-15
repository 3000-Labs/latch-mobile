import Box from '@/src/components/shared/Box';
import LoadingBlur from '@/src/components/shared/LoadingBlur';
import Text from '@/src/components/shared/Text';
import AmountEntryStep from '@/src/components/send-token/AmountEntryStep';
import RecipientStep from '@/src/components/send-token/RecipientStep';
import SuccessStep from '@/src/components/send-token/SuccessStep';
import TokenSelectionStep from '@/src/components/send-token/TokenSelectionStep';
import { Recipient, SendStatus, SendToken as SendTokenType } from '@/src/components/send-token/types';
import { sendToken } from '@/src/api/send-token';
import { usePortfolio } from '@/src/hooks/use-portfolio';
import { useTrackedTokens } from '@/src/hooks/use-tracked-tokens';
import { deriveWalletAtIndex } from '@/src/lib/seed-wallet';
import { useWalletStore } from '@/src/store/wallet';
import { ACTIVE_NETWORK } from '@/src/constants/config';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';

const SendToken = () => {
  const theme = useTheme<Theme>();
  const { smartAccountAddress, accounts, activeAccountIndex, mnemonic } = useWalletStore();
  const activeAccount = accounts[activeAccountIndex];
  const { tokens: trackedTokens } = useTrackedTokens();

  const { data: portfolio } = usePortfolio(
    smartAccountAddress,
    activeAccount?.gAddress,
    trackedTokens,
  );

  const [selectedToken, setSelectedToken] = useState<SendTokenType | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('0');
  const [status, setStatus] = useState<SendStatus>('initial');
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const tokens = portfolio ?? [];

  const handleBack = () => {
    if (status === 'success' || status === 'error') {
      router.back();
      return;
    }
    if (selectedWallet) {
      setSelectedWallet(null);
      setAmount('0');
    } else if (selectedToken) {
      setSelectedToken(null);
    } else {
      router.back();
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (key === '.') {
      if (!amount.includes('.')) {
        setAmount((prev) => prev + '.');
      }
    } else {
      setAmount((prev) => (prev === '0' ? key : prev + key));
    }
  };

  const handleMaxPress = () => {
    if (selectedToken) {
      setAmount(selectedToken.amount);
    }
  };

  const isAmountValid = () => {
    if (!selectedToken) return false;
    const entered = parseFloat(amount);
    return entered > 0 && entered <= parseFloat(selectedToken.amount);
  };

  const handleSend = async () => {
    if (!selectedToken || !selectedWallet || !isAmountValid() || !mnemonic || !smartAccountAddress) {
      return;
    }

    setStatus('sending');
    setErrorMessage(undefined);

    try {
      const wallet = deriveWalletAtIndex(mnemonic, activeAccountIndex >= 0 ? activeAccountIndex : 0);
      const result = await sendToken({
        sacContractId: selectedToken.sacContractId,
        fromCAddress: smartAccountAddress,
        toAddress: selectedWallet.address,
        amountHuman: amount,
        decimals: 7,
        userKeypair: wallet.keypair,
        rpcUrl: ACTIVE_NETWORK.sorobanRpcUrl,
        networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
        horizonUrl: ACTIVE_NETWORK.horizonUrl,
      });

      if (result.success) {
        setTxHash(result.hash);
        setStatus('success');
      } else {
        setErrorMessage(result.error ?? 'Transaction failed.');
        setStatus('error');
      }
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Unknown error');
      setStatus('error');
    }
  };

  const headerTitle = () => {
    if (status === 'success' || status === 'error') return '';
    if (!selectedToken) return 'Select Token';
    if (!selectedWallet) return 'Recipient';
    return `Send ${selectedToken.code}`;
  };

  const showNextButton = selectedWallet && status === 'initial';

  const renderContent = () => {
    if (status === 'success') {
      return (
        <SuccessStep
          amount={amount}
          tokenCode={selectedToken?.code ?? ''}
          recipient={selectedWallet?.address ?? ''}
          txHash={txHash}
          onContinue={() => router.back()}
        />
      );
    }

    if (status === 'error') {
      return (
        <Box flex={1} paddingHorizontal="l" justifyContent="space-between" pb="xl">
          <Box flex={1} justifyContent="center" alignItems="center" px="m">
            <Ionicons name="close-circle" size={64} color={theme.colors.inputError} />
            <Text variant="h8" color="textPrimary" fontWeight="700" mt="l" mb="s">
              Transaction Failed
            </Text>
            <Text variant="p7" color="textSecondary" textAlign="center">
              {errorMessage}
            </Text>
          </Box>
          <TouchableOpacity activeOpacity={0.8} onPress={() => { setStatus('initial'); }}>
            <Box height={56} backgroundColor="primary" borderRadius={28} justifyContent="center" alignItems="center">
              <Text variant="p6" color="black" fontWeight="700">Try Again</Text>
            </Box>
          </TouchableOpacity>
        </Box>
      );
    }

    if (!selectedToken) {
      return <TokenSelectionStep tokens={tokens} onSelectToken={setSelectedToken} />;
    }

    if (!selectedWallet) {
      return <RecipientStep onSelectWallet={setSelectedWallet} />;
    }

    return (
      <AmountEntryStep
        selectedToken={selectedToken}
        selectedWallet={selectedWallet}
        amount={amount}
        onKeyPress={handleKeyPress}
        onMaxPress={handleMaxPress}
      />
    );
  };

  return (
    <Box
      flex={1}
      backgroundColor="cardbg"
      style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}
    >
      <StatusBar style="light" />

      <Box alignItems="center" pt="m">
        <Box width={36} height={4} borderRadius={2} backgroundColor="gray800" />
      </Box>

      <Box
        height={56}
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="m"
      >
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>

        {status === 'initial' && (
          <Text variant="h10" color="textPrimary" fontWeight="700">
            {headerTitle()}
          </Text>
        )}

        {showNextButton ? (
          <TouchableOpacity onPress={handleSend} disabled={!isAmountValid()}>
            <Text
              variant="p7"
              color={isAmountValid() ? 'primary700' : 'textSecondary'}
              fontWeight="700"
            >
              Send
            </Text>
          </TouchableOpacity>
        ) : (
          <Box width={40} />
        )}
      </Box>

      {renderContent()}

      <LoadingBlur visible={status === 'sending'} text="Sending..." />
    </Box>
  );
};

export default SendToken;
