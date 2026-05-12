import Box from '@/src/components/shared/Box';
import LoadingBlur from '@/src/components/shared/LoadingBlur';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { TouchableOpacity } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import sub-components
import AmountEntryStep from '@/src/components/send-token/AmountEntryStep';
import RecipientStep from '@/src/components/send-token/RecipientStep';
import SuccessStep from '@/src/components/send-token/SuccessStep';
import TokenSelectionStep from '@/src/components/send-token/TokenSelectionStep';
import TransactionDetailsStep from '@/src/components/send-token/TransactionDetailsStep';
import { SendStatus, Token, Wallet } from '@/src/components/send-token/types';

const SendToken = () => {
  // const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();
  const [selectedToken, setSelectedToken] = React.useState<null | Token>(null);
  const [selectedWallet, setSelectedWallet] = React.useState<null | Wallet>(null);
  const [isSymbolMode] = React.useState(false);
  const [amount, setAmount] = React.useState('0');
  const [status, setStatus] = React.useState<SendStatus>('initial');

  const handleBack = () => {
    if (status === 'success' || status === 'view_transaction') {
      router.back();
      return;
    }
    if (selectedWallet) {
      setSelectedWallet(null);
    } else if (selectedToken) {
      setSelectedToken(null);
    } else {
      router.back();
    }
  };

  const handleSend = () => {
    setStatus('sending');
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else {
      setAmount((prev) => (prev === '0' ? key : prev + key));
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'view_transaction':
        return <TransactionDetailsStep onClose={() => router.back()} />;
      case 'success':
        return (
          <SuccessStep
            onViewTransaction={() => setStatus('view_transaction')}
            onContinue={() => router.back()}
          />
        );
      case 'sending':
        return null;
      default:
        if (!selectedToken) {
          return <TokenSelectionStep onSelectToken={setSelectedToken} />;
        }
        if (!selectedWallet) {
          return <RecipientStep onSelectWallet={setSelectedWallet} />;
        }
        return (
          <AmountEntryStep
            selectedWallet={selectedWallet}
            amount={amount}
            isSymbolMode={isSymbolMode}
            onKeyPress={handleKeyPress}
          />
        );
    }
  };

  return (
    <Box
      flex={1}
      backgroundColor="cardbg"
      style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}
    >
      <StatusBar style="light" />

      {/* Bottom Sheet Handle */}
      <Box alignItems="center" pt="m">
        <Box width={36} height={4} borderRadius={2} backgroundColor="gray800" />
      </Box>

      {/* Header */}
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
        {status !== 'success' && status !== 'view_transaction' && (
          <>
            <Text variant="h10" color="textPrimary" fontWeight="700">
              {selectedToken ? `Select ${selectedToken.symbol}` : 'Select Token'}
            </Text>
            {selectedWallet ? (
              <TouchableOpacity onPress={handleSend}>
                <Text
                  variant="p7"
                  color={amount !== '0' ? 'primary' : 'textPrimary'}
                  fontWeight="700"
                >
                  Next
                </Text>
              </TouchableOpacity>
            ) : (
              <Box width={24} />
            )}
          </>
        )}
      </Box>

      {renderContent()}

      <LoadingBlur
        visible={status === 'sending'}
        text="Sending..."
        subText={'0.000345SOL to Crownz Wallet \n{0xE643...e16c} '}
      />
    </Box>
  );
};

export default SendToken;
