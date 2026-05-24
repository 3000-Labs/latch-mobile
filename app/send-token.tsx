import AddressBookSheet from '@/src/components/profile/AddressBookSheet';
import AmountEntryStep from '@/src/components/send-token/AmountEntryStep';
import RecipientStep from '@/src/components/send-token/RecipientStep';
import SuccessStep from '@/src/components/send-token/SuccessStep';
import TokenSelectionStep from '@/src/components/send-token/TokenSelectionStep';
import {
  Recipient,
  SendStatus,
  SendToken as SendTokenType,
} from '@/src/components/send-token/types';
import Box from '@/src/components/shared/Box';
import LoadingBlur from '@/src/components/shared/LoadingBlur';
import Text from '@/src/components/shared/Text';
import TxAuthModal from '@/src/components/shared/TxAuthModal';
import { useAddressBook } from '@/src/hooks/use-address-book';
import { usePortfolio } from '@/src/hooks/use-portfolio';
import { usePrices } from '@/src/hooks/use-prices';
import { useTrackedTokens } from '@/src/hooks/use-tracked-tokens';
import { sendTokenFromPasskeyAccount, sendTokenFromSmartAccount } from '@/src/services/send-token';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { maskAddress } from '@/src/utils';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Dimensions, Image, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

const SendToken = () => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  const queryClient = useQueryClient();
  const { address: scannedAddress } = useLocalSearchParams<{ address?: string }>();
  const { smartAccountAddress, accounts, activeAccountIndex, mnemonic } = useWalletStore();
  const activeAccount = accounts[activeAccountIndex];
  const { tokens: trackedTokens } = useTrackedTokens();
  const { data: prices } = usePrices();
  const { entries: addressBookEntries } = useAddressBook();

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

  const [saveAddressVisible, setSaveAddressVisible] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('');
  const authResolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [isKeyMismatch, setIsKeyMismatch] = useState(false);
  const [isRedeploying, setIsRedeploying] = useState(false);

  const tokens = portfolio ?? [];

  const requestAuth = (message: string): Promise<boolean> =>
    new Promise((resolve) => {
      authResolveRef.current = resolve;
      setAuthPromptMessage(message);
      setShowAuthModal(true);
    });

  const handleAuthResult = (confirmed: boolean) => {
    setShowAuthModal(false);
    authResolveRef.current?.(confirmed);
    authResolveRef.current = null;
  };

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
      if (!amount.includes('.')) setAmount((prev) => prev + '.');
    } else {
      setAmount((prev) => (prev === '0' ? key : prev + key));
    }
  };

  const handleMaxPress = () => {
    if (selectedToken) setAmount(selectedToken.amount);
  };

  const handlePresetUSD = (usdAmount: number) => {
    if (!selectedToken || !prices) return;
    const price = parseFloat(prices[selectedToken.code]?.price ?? '0');
    if (price <= 0) return;
    const tokenAmount = Math.min(usdAmount / price, parseFloat(selectedToken.amount));
    setAmount(tokenAmount.toFixed(7));
  };

  const isAmountValid = () => {
    if (!selectedToken) return false;
    const entered = parseFloat(amount);
    return entered > 0 && entered <= parseFloat(selectedToken.amount);
  };

  const headerTitle = () => {
    if (status === 'success' || status === 'error') return '';
    if (!selectedToken) return 'Select Token';
    if (!selectedWallet) return 'Recipient';
    return `Send ${selectedToken.code}`;
  };

  const handleSend = async () => {
    if (!selectedToken || !selectedWallet || !isAmountValid()) return;

    const confirmed = await requestAuth(
      `Send ${amount} ${selectedToken.code} to ${selectedWallet.address.slice(0, 8)}...`,
    );
    if (!confirmed) return;

    if (!smartAccountAddress) {
      setErrorMessage('No smart account found. Please complete wallet setup.');
      setStatus('error');
      return;
    }

    const activeAccount = accounts[activeAccountIndex];
    const isPasskeyAccount = !activeAccount?.gAddress;

    setStatus('sending');
    try {
      let result;
      if (isPasskeyAccount) {
        result = await sendTokenFromPasskeyAccount({
          smartAccountAddress,
          listIndex: activeAccountIndex,
          sacContractId: selectedToken.sacContractId,
          destinationAddress: selectedWallet.address,
          amount,
        });
      } else {
        const { deriveWalletAtIndex } = await import('@/src/lib/seed-wallet');
        const wallet = deriveWalletAtIndex(mnemonic!, activeAccount!.index);
        result = await sendTokenFromSmartAccount({
          smartAccountAddress,
          keypair: wallet.keypair,
          sacContractId: selectedToken.sacContractId,
          destinationAddress: selectedWallet.address,
          amount,
        });
      }
      setTxHash(result.hash);
      setStatus('success');
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      setIsKeyMismatch(msg.startsWith('PASSKEY_KEY_MISMATCH'));
      setErrorMessage(
        msg.startsWith('PASSKEY_KEY_MISMATCH')
          ? 'Your account credential has changed. Re-initialize to continue.'
          : msg,
      );
      setStatus('error');
    }
  };

  const handleRedeploy = async () => {
    setIsRedeploying(true);
    try {
      const { redeployWithCurrentKey } = await import('@/src/lib/passkey-webauthn');
      const newAddress = await redeployWithCurrentKey(activeAccountIndex);
      const { useWalletStore: ws } = await import('@/src/store/wallet');
      ws.getState().setSmartAccountAddress(newAddress);
      setIsKeyMismatch(false);
      setStatus('initial');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Re-deploy failed');
    } finally {
      setIsRedeploying(false);
    }
  };

  const showNextButton = selectedWallet && status === 'initial';

  const renderContent = () => {
    if (status === 'success') {
      const recipientAddress = selectedWallet?.address ?? '';
      const alreadySaved = addressBookEntries.some((e) => e.address === recipientAddress);
      return (
        <SuccessStep
          amount={amount}
          tokenCode={selectedToken?.code ?? ''}
          recipient={recipientAddress}
          txHash={txHash}
          onContinue={() => router.back()}
          onSaveAddress={!alreadySaved ? () => setSaveAddressVisible(true) : undefined}
        />
      );
    }

    if (status === 'error') {
      return (
        <Box flex={1} paddingHorizontal="l" justifyContent="space-between" pb="xl">
          <Box flex={1} justifyContent="center" alignItems="center" px="m">
            <Image
              source={require('@/src/assets/images/error.png')}
              style={{ width: width, height: width * 0.55 }}
              resizeMode="contain"
            />
            <Text variant="h8" color="textPrimary" fontWeight="700" mt="l" mb="s">
              Transaction Failed
            </Text>
            <Text variant="p7" color="textSecondary" textAlign="center">
              {errorMessage}
            </Text>
          </Box>
          {isKeyMismatch ? (
            <TouchableOpacity activeOpacity={0.8} onPress={handleRedeploy} disabled={isRedeploying}>
              <Box
                height={56}
                backgroundColor="primary"
                borderRadius={28}
                justifyContent="center"
                alignItems="center"
              >
                <Text variant="p6" color="black" fontWeight="700">
                  {isRedeploying ? 'Re-initializing…' : 'Re-initialize Account'}
                </Text>
              </Box>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.8} onPress={() => setStatus('initial')}>
              <Box
                height={56}
                backgroundColor="primary"
                borderRadius={28}
                justifyContent="center"
                alignItems="center"
              >
                <Text variant="p6" color="black" fontWeight="700">
                  Try Again
                </Text>
              </Box>
            </TouchableOpacity>
          )}
        </Box>
      );
    }

    if (!selectedToken) {
      return <TokenSelectionStep tokens={tokens} onSelectToken={setSelectedToken} />;
    }

    if (!selectedWallet) {
      return <RecipientStep onSelectWallet={setSelectedWallet} initialAddress={scannedAddress} />;
    }

    return (
      <AmountEntryStep
        selectedToken={selectedToken}
        selectedWallet={selectedWallet}
        amount={amount}
        onKeyPress={handleKeyPress}
        onMaxPress={handleMaxPress}
        onPresetPress={handlePresetUSD}
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
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? theme.colors.white : theme.colors.black}
          />
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

      <TxAuthModal
        visible={showAuthModal}
        promptMessage={authPromptMessage}
        onResult={handleAuthResult}
      />

      <AddressBookSheet
        visible={saveAddressVisible}
        onClose={() => setSaveAddressVisible(false)}
        prefillAddress={selectedWallet?.address}
      />

      <LoadingBlur
        visible={status === 'sending'}
        text="Sending..."
        subText={`${amount}${selectedToken?.code} was successfully sent to ${maskAddress(selectedWallet?.address || '')} `}
      />
    </Box>
  );
};

export default SendToken;
