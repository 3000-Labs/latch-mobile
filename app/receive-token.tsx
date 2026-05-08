import { TOKENS, Token } from '@/src/components/send-token/types';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, ScrollView, Share, TextInput, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

type Stage = 'SELECT' | 'ADDRESS';

const ReceiveToken = () => {
  const theme = useTheme<Theme>();
  const router = useRouter();
  const { smartAccountAddress } = useWalletStore();
  const [stage, setStage] = React.useState<Stage>('SELECT');
  const [selectedToken, setSelectedToken] = React.useState<Token | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredTokens = TOKENS.filter(
    (token) =>
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleBack = () => {
    if (stage === 'ADDRESS') {
      setStage('SELECT');
    } else {
      router.back();
    }
  };

  const handleSelectToken = (token: Token) => {
    setSelectedToken(token);
    setStage('ADDRESS');
  };

  const handleShare = async () => {
    if (smartAccountAddress) {
      try {
        await Share.share({
          message: smartAccountAddress,
        });
      } catch (error) {
        console.log(error);
      }
    }
  };

  const copyToClipboard = async () => {
    if (smartAccountAddress) {
      await Clipboard.setStringAsync(smartAccountAddress);
      // Optional: Add toast notification
    }
  };

  const renderSelectStage = () => (
    <>
      {/* Search Bar */}
      <Box paddingHorizontal="m" mt="s" mb="m">
        <Box
          flexDirection="row"
          alignItems="center"
          backgroundColor="bg900"
          borderRadius={14}
          paddingHorizontal="m"
          height={48}
          borderWidth={1}
          borderColor="gray900"
        >
          <TextInput
            placeholder="Search for tokens..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              color: theme.colors.textPrimary,
              fontSize: 15,
              fontFamily: 'SFproRegular',
            }}
          />
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        </Box>
      </Box>

      {/* Token List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {filteredTokens.map((token) => (
          <TouchableOpacity
            key={token.id}
            activeOpacity={0.7}
            onPress={() => handleSelectToken(token)}
          >
            <Box
              flexDirection="row"
              alignItems="center"
              backgroundColor="bg11"
              borderRadius={16}
              padding="m"
              mb="s"
              height={82}
            >
              {/* Token Icon */}
              <Box
                width={44}
                height={44}
                borderRadius={12}
                backgroundColor="black"
                justifyContent="center"
                alignItems="center"
                mr="m"
              >
                <Image
                  source={token.icon}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                />
              </Box>

              {/* Token Info */}
              <Box flex={1}>
                <Text variant="h10" color="textPrimary" fontWeight="700" mb="xs">
                  {token.name}
                </Text>
                <Box flexDirection="row" alignItems="center">
                  <Text
                    variant="captionSemibold"
                    color="textSecondary"
                    style={{ letterSpacing: 0.5 }}
                  >
                    BALANCE{' '}
                  </Text>
                  <Text variant="captionBold" color="textPrimary" style={{ letterSpacing: 0.5 }}>
                    {token.balance} {token.symbol}
                  </Text>
                </Box>
              </Box>

              {/* Actions */}
              <Box flexDirection="row" alignItems="center" gap="m">
                <TouchableOpacity onPress={() => handleSelectToken(token)}>
                  <Ionicons name="qr-code-outline" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={copyToClipboard}>
                  <Ionicons name="copy-outline" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </Box>
            </Box>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  const renderAddressStage = () => {
    if (!selectedToken) return null;

    const displayAddress = smartAccountAddress
      ? `${smartAccountAddress.slice(0, 8)}...${smartAccountAddress.slice(-6)}`
      : '0x0000...0000';

    return (
      <Box flex={1} paddingHorizontal="l" alignItems="center" pt="xl">
        {/* QR Code Container */}
        <Box backgroundColor="white" padding="s" borderRadius={8} mb="xl" style={{ marginTop: 20 }}>
          <QRCode
            value={smartAccountAddress || ''}
            size={180}
            logo={selectedToken.icon}
            logoSize={40}
            logoBackgroundColor="white"
            logoBorderRadius={8}
            logoMargin={4}
          />
        </Box>

        {/* Title & Description */}
        <Text variant="h7" color="textPrimary" fontWeight="700" textAlign="center" mb="m">
          Your {selectedToken.name} Address
        </Text>
        <Box px="m">
          <Text textAlign="center" lineHeight={22}>
            <Text variant="p5" color="textSecondary">
              Use this address to receive tokens {'  \n'}
            </Text>
            <Text variant="p5" color="textPrimary" fontWeight="700">
              on {selectedToken.name}
            </Text>
            <Text variant="p5" color="textSecondary">
              .
            </Text>
          </Text>
        </Box>

        {/* Bottom Actions */}
        <Box width="100%" position="absolute" bottom={40} gap="s">
          <TouchableOpacity activeOpacity={0.8} onPress={handleShare}>
            <Box
              height={56}
              backgroundColor="primary"
              borderRadius={28}
              justifyContent="center"
              alignItems="center"
            >
              <Text variant="p6" color="black" fontWeight="700">
                Share
              </Text>
            </Box>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} onPress={copyToClipboard}>
            <Box
              height={56}
              backgroundColor="bg11"
              borderRadius={28}
              flexDirection="row"
              justifyContent="center"
              alignItems="center"
              borderWidth={1}
              borderColor="gray900"
            >
              <Text variant="p7" color="textPrimary" fontWeight="600" mr="s">
                {displayAddress}
              </Text>
              <Ionicons name="copy-outline" size={16} color={theme.colors.textPrimary} />
            </Box>
          </TouchableOpacity>
        </Box>
      </Box>
    );
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
        <TouchableOpacity onPress={handleBack} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text variant="h10" color="textPrimary" fontWeight="700">
          {stage === 'SELECT' ? 'Select Token' : `Your ${selectedToken?.name} Address`}
        </Text>
        <Box width={24}>
          {stage === 'SELECT' && (
            <TouchableOpacity>
              <Ionicons name="scan-outline" size={22} color={theme.colors.white} />
            </TouchableOpacity>
          )}
        </Box>
      </Box>

      {stage === 'SELECT' ? renderSelectStage() : renderAddressStage()}
    </Box>
  );
};

export default ReceiveToken;
