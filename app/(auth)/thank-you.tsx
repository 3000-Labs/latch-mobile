import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Dimensions, Image, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { maskAddress } from '@/src/utils';

const { width } = Dimensions.get('window');

const ThankYou = () => {
  const router = useRouter();
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const [copied, setCopied] = useState(false);

  const params = useLocalSearchParams<{
    title?: string;
    subtext?: string;
    buttonLabel?: string;
    buttonFunction?: string;
    imageSource?: string;
    accountAddress?: string;
  }>();

  const title = params.title || 'Thank You';
  const subtext =
    params.subtext || 'Your email has been confirmed. Please proceed to sign in to your account.';
  const buttonLabel = params.buttonLabel || 'Go to Home';
  const imageSource = params.imageSource || 'success';

  const handleButtonPress = () => {
    if (params.buttonFunction) {
      router.push(params.buttonFunction as any);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleCopy = async () => {
    if (params.accountAddress) {
      await Clipboard.setStringAsync(params.accountAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getImageSource = () => {
    switch (imageSource) {
      case 'success':
        return require('@/src/assets/images/success.png');
      case 'mailbox':
        return require('@/src/assets/images/mailbox.png');
      default:
        // Use exactly the image check3d.png if it becomes available, otherwise default to success
        return require('@/src/assets/images/success.png');
    }
  };

  return (
    <Box
      flex={1}
      backgroundColor="mainBackground"
      px="m"
      style={{ paddingTop: 60, paddingBottom: 40 }}
    >
      <StatusBar style={statusBarStyle} />

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <Image
          source={require('@/src/assets/images/logosym.png')}
          style={{ width: 35, height: 35 }}
          resizeMode="contain"
        />

        <Box width={24} />
      </Box>

      {/* Main Content */}
      <Box flex={1} justifyContent="center" alignItems="center">
        <Image
          source={getImageSource()}
          style={{ width: width * 0.55, height: width * 0.55 }}
          resizeMode="contain"
        />

        <Box alignItems="center" mt="xl" width="100%">
          <Text variant="h8" fontSize={28} fontWeight="700" textAlign="center" color="textPrimary">
            {title}
          </Text>
          <Text
            variant="p5"
            color="textSecondary"
            mt="s"
            textAlign="center"
            style={{ marginHorizontal: 'auto', width: width * 0.8 }}
          >
            {subtext}
          </Text>
        </Box>

        {params.accountAddress && (
          <Box
            width="100%"
            mt="xl"
            backgroundColor={statusBarStyle !== 'dark' ? 'bg800' : 'text500'}
            borderRadius={16}
            p="m"
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Text variant="body" fontWeight="600" color="textPrimary">
                Your Smart Account
              </Text>
              <Text variant="body" color="textSecondary" mt="xs">
                {maskAddress(params.accountAddress)}
              </Text>
            </Box>
            <TouchableOpacity
              onPress={handleCopy}
              activeOpacity={0.7}
              hitSlop={{ top: 15, left: 15, right: 15, bottom: 15 }}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </Box>
        )}
      </Box>

      {/* Button */}
      <Box>
        <Button
          label={buttonLabel}
          variant="primary"
          onPress={handleButtonPress}
          bg="primary700"
          labelColor="black"
        />
      </Box>
    </Box>
  );
};

export default ThankYou;
