import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import ShareCard from '@/src/components/receive-token/ShareCard';
import { type TokenBalance } from '@/src/hooks/use-portfolio';
import { useTokenIcon } from '@/src/hooks/use-token-list';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const STELLAR_LOGO = require('@/src/assets/token/stellar.png');

interface Props {
  token: TokenBalance;
  address: string;
  onCopy: () => void;
}

const AddressStage = ({ token, address, onCopy }: Props) => {
  const theme = useTheme<Theme>();
  const iconUrl = useTokenIcon(token.code, token.issuer);
  const qrRef = useRef<any>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const logoSource = iconUrl ? { uri: iconUrl } : STELLAR_LOGO;
  const displayAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;

  return (
    <Box flex={1} paddingHorizontal="l" alignItems="center" pt="xl">
      <Box backgroundColor="white" padding="s" borderRadius={8} mb="xl" style={{ marginTop: 20 }}>
        <QRCode
          value={address}
          size={200}
          getRef={(ref) => {
            qrRef.current = ref;
          }}
          logo={logoSource}
          logoSize={44}
          logoBackgroundColor="white"
          logoBorderRadius={22}
          logoMargin={4}
        />
      </Box>

      <Text variant="h7" color="textPrimary" fontWeight="700" textAlign="center" mb="m">
        Your {token.code} Address
      </Text>
      <Box px="m">
        <Text variant="p5" color="textSecondary" textAlign="center">
          Use this address to receive {token.code}
        </Text>
      </Box>

      <Box width="100%" position="absolute" bottom={40} gap="s">
        <TouchableOpacity activeOpacity={0.8} onPress={() => setShowShareCard(true)}>
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

        <TouchableOpacity activeOpacity={0.7} onPress={onCopy}>
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

      {showShareCard && (
        <ShareCard token={token} address={address} onClose={() => setShowShareCard(false)} />
      )}
    </Box>
  );
};

export default AddressStage;
