import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FundInfoSheet from './FundInfoSheet';
import FundingStatusSheet from './FundingStatusSheet';

import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import * as Clipboard from 'expo-clipboard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  address: string;
  memo: string;
}

const FundWalletSheet = ({ visible, onClose, address, memo }: Props) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [infoVisible, setInfoVisible] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 150,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.bg11,
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateY }],
            maxHeight: SCREEN_HEIGHT * 0.9,
          },
        ]}
      >
        <BottomSheetHandle />

        {/* Header */}
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="m"
          py="m"
          mb="s"
        >
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <Text variant="h10" color="textPrimary" fontWeight="700">
            Fund Wallet
          </Text>

          <TouchableOpacity
            onPress={() => setInfoVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </Box>

        <Box paddingHorizontal="m" mt="s">
          {/* Proxy G-Address Section */}
          <Box mb="l">
            <Text variant="p7" color="textPrimary" fontWeight="700" mb="s">
              Proxy G-Address
            </Text>
            <Box
              backgroundColor={isDark ? 'gray900' : 'btnDisabled'}
              borderRadius={12}
              padding="m"
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              minHeight={64}
            >
              <Box flex={1} marginRight="s">
                <Text variant="p7" color="textSecondary" numberOfLines={2}>
                  {address}
                </Text>
              </Box>
              <TouchableOpacity onPress={() => copyToClipboard(address)}>
                <Ionicons name="copy-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </Box>
          </Box>

          {/* Memo Section */}
          <Box mb="l">
            <Text variant="p7" color="textPrimary" fontWeight="700" mb="s">
              Memo (Required)
            </Text>
            <Box
              backgroundColor={isDark ? 'gray900' : 'btnDisabled'}
              borderRadius={12}
              padding="m"
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              minHeight={56}
            >
              <Text variant="p7" color="textSecondary">
                {memo}
              </Text>
              <TouchableOpacity onPress={() => copyToClipboard(memo)}>
                <Ionicons name="copy-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </Box>
          </Box>

          {/* Divider */}
          <Box flexDirection="row" alignItems="center" mb="l">
            <Box flex={1} height={1} backgroundColor="gray800" />
            <Text variant="p7" color="textSecondary" mx="m">
              OR
            </Text>
            <Box flex={1} height={1} backgroundColor="gray800" />
          </Box>

          {/* QR Code Section */}
          <Box alignItems="center" mb="xl">
            <Box
              backgroundColor="white"
              padding="m"
              borderRadius={24}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
              }}
            >
              <QRCode
                value={address}
                size={160}
                logo={require('@/src/assets/token/stellar.png')}
                logoSize={40}
                logoBackgroundColor="transparent"
                logoMargin={1}
                logoBorderRadius={20}
              />
            </Box>

            <Text variant="p6" color="textSecondary" textAlign="center" mt="l" lineHeight={22}>
              Use this address to fund tokens to{'\n'}your{' '}
              <Text fontWeight="700" color="textPrimary">
                Wallet
              </Text>
              .
            </Text>
          </Box>

          {/* Action Buttons */}
          <Box gap="m">
            <TouchableOpacity activeOpacity={0.8} onPress={() => copyToClipboard(address)}>
              <Box
                height={56}
                backgroundColor="primary"
                borderRadius={28}
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gap="s"
              >
                <Text variant="h10" color="black" fontWeight="700">
                  Copy
                </Text>
                <Ionicons name="copy-outline" size={18} color="black" />
              </Box>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} onPress={() => setStatusVisible(true)}>
              <Box
                height={56}
                backgroundColor="bg11"
                borderRadius={28}
                justifyContent="center"
                alignItems="center"
                borderWidth={1}
                borderColor="gray800"
              >
                <Text variant="p6" color="textPrimary" fontWeight="700">
                  Check Deposit Status
                </Text>
              </Box>
            </TouchableOpacity>
          </Box>
        </Box>
      </Animated.View>
      <FundInfoSheet visible={infoVisible} onClose={() => setInfoVisible(false)} />
      <FundingStatusSheet visible={statusVisible} onClose={() => setStatusVisible(false)} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
});

export default FundWalletSheet;
