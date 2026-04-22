import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';

import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const { width } = Dimensions.get('window');

const RecoveryPhrase = () => {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const router = useRouter();
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mock recovery phrase - replace with actual data
  const recoveryPhrase = [
    'abandon',
    'ability',
    'able',
    'about',
    'above',
    'absent',
    'absorb',
    'abstract',
    'absurd',
    'abuse',
    'access',
    'accident',
  ];

  const handleCopyAll = async () => {
    const phraseText = recoveryPhrase.join(' ');
    await Clipboard.setStringAsync(phraseText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const itemWidth = (width - theme.spacing.m * 2 - theme.spacing.m * 2) / 3;

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style={statusBarStyle} />
      <View style={{ flex: 1 }}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.m,
            paddingBottom: 40,
            paddingTop: 60,
            flexGrow: 1,
          }}
        >
          {/* Header Section */}
          <Box flexDirection="row" justifyContent="space-between" mb="m">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>

            <Image
              source={require('@/src/assets/images/logosym.png')}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
            <Box width={40} />
          </Box>

          {/* Title Section */}
          <Box alignItems="center" mb="xxl">
            <Text variant="h7" fontSize={32} textAlign="center">
              Save Your Recovery Phrase
            </Text>
            <Text variant="p5" color="textSecondary" mt="xs" textAlign="center" width={'85%'}>
              Never share this. Anyone with these words can access your account.
            </Text>
          </Box>

          {/* Recovery Phrase Display */}
          <Box mb="xxl">
            {/* Spacer or Copy Button at Top Right */}

            <View style={{ position: 'relative', borderRadius: 16 }}>
              {/* Recovery Words Grid - 2 columns */}
              <Box flexDirection="row" flexWrap="wrap" gap="m">
                {recoveryPhrase.map((word, index) => (
                  <Box
                    key={index}
                    width={itemWidth}
                    paddingHorizontal="m"
                    height={52}
                    backgroundColor={statusBarStyle !== 'light' ? 'text50' : 'gray900'}
                    borderRadius={12}
                    borderWidth={1}
                    borderColor="gray800"
                    flexDirection="row"
                    alignItems="center"
                    gap="xs"
                  >
                    <Text variant="body" color="textSecondary" fontWeight="600" minWidth={20}>
                      {index + 1}
                    </Text>
                    <Text variant="body" color="textPrimary" fontWeight="600">
                      {word}
                    </Text>
                  </Box>
                ))}
              </Box>

              {isRevealed ? (
                <Box alignItems="flex-end" mt="m" pr={'s'}>
                  <TouchableOpacity
                    onPress={handleCopyAll}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.s,
                    }}
                  >
                    <Ionicons name="copy" size={16} color={theme.colors.primary700} />
                    <Text variant="body" color="primary600" fontWeight="600">
                      {copied ? 'Copied!' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </Box>
              ) : (
                <Box height={24} mb="m" />
              )}

              {/* Blur Overlay */}
              {!isRevealed && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setIsRevealed(true)}
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 10,
                    },
                  ]}
                >
                  <BlurView intensity={30} tint={'dark'} style={StyleSheet.absoluteFill} />
                  <Box justifyContent="center" alignItems="center">
                    {/* <Image
                      source={require('@/src/assets/images/shieldLoader.png')}
                      style={{ width: 100, height: 100 }}
                      resizeMode="contain"
                    /> */}
                    <Text variant="p5" color="textPrimary" fontWeight="600" textAlign="center">
                      Tap to reveal
                    </Text>
                  </Box>
                </TouchableOpacity>
              )}
            </View>
          </Box>
        </ScrollView>

        {/* Continue Button - Always at Bottom */}
        <Box padding="m" mb={'l'} backgroundColor="mainBackground">
          <Button
            label="Continue"
            variant={isRevealed ? 'primary' : 'disabled'}
            onPress={() => isRevealed && router.push('/(onboarding)/verify-phrase')}
            bg={isRevealed ? 'primary700' : 'btnDisabled'}
            labelColor={isRevealed ? 'black' : 'gray600'}
            disabled={!isRevealed}
          />
        </Box>
      </View>
    </Box>
  );
};

export default RecoveryPhrase;
