import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, TouchableOpacity, View } from 'react-native';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import LoadingBlur from '@/src/components/shared/LoadingBlur';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const { width } = Dimensions.get('window');

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

const VerifyPhrase = () => {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const router = useRouter();

  const [missingIndices, setMissingIndices] = useState<number[]>([]);
  const [shuffledBank, setShuffledBank] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<(string | null)[]>([null, null, null]);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Select 3 random unique indices from 0 to 11
    const indices: number[] = [];
    while (indices.length < 3) {
      const r = Math.floor(Math.random() * 12);
      if (!indices.includes(r)) indices.push(r);
    }
    indices.sort((a, b) => a - b);
    setMissingIndices(indices);

    // Shuffle the 12 words for the bottom word bank
    const shuffled = [...recoveryPhrase].sort(() => 0.5 - Math.random());
    setShuffledBank(shuffled);
  }, []);

  const handleSelectWord = (word: string) => {
    const emptyIndex = selectedWords.findIndex((w) => w === null);
    if (emptyIndex !== -1) {
      const newSelected = [...selectedWords];
      newSelected[emptyIndex] = word;
      setSelectedWords(newSelected);
    }
  };

  const handleDeselectWord = (index: number) => {
    const newSelected = [...selectedWords];
    newSelected[index] = null;
    setSelectedWords(newSelected);
  };

  const isAllFilled = !selectedWords.includes(null);

  const handleVerify = () => {
    const isCorrect = missingIndices.every(
      (mIndex, i) => recoveryPhrase[mIndex] === selectedWords[i],
    );

    if (isCorrect) {
      // Navigate forward if valid
      // Following standard routing for now, adjust the final destination if necessary
      router.push('/(onboarding)/set-pin');
    } else {
      // Just clear selection if validation fails, or allow retrying
      setSelectedWords([null, null, null]);
    }
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
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="xl">
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

          {/* Title Section */}
          <Box alignItems="center" mb="xl">
            <Text
              variant="h8"
              fontSize={28}
              fontWeight="700"
              textAlign="center"
              color="textPrimary"
            >
              Confirm Your Phrase
            </Text>
            <Text variant="body" color="textSecondary" mt="s" textAlign="center">
              Select the correct words in order.
            </Text>
          </Box>

          {/* Slots Section */}
          <Box gap="m" mb="xl">
            {missingIndices.map((trueIndex, slotIndex) => (
              <TouchableOpacity
                key={slotIndex}
                activeOpacity={selectedWords[slotIndex] ? 0.7 : 1}
                onPress={() => {
                  if (selectedWords[slotIndex]) handleDeselectWord(slotIndex);
                }}
              >
                <Box
                  height={56}
                  paddingHorizontal="l"
                  backgroundColor={statusBarStyle !== 'dark' ? 'gray900' : 'text500'}
                  borderColor={statusBarStyle !== 'dark' ? 'gray900' : 'text500'}
                  borderWidth={1}
                  borderRadius={12}
                  flexDirection="row"
                  alignItems="center"
                >
                  <Text
                    variant="body"
                    color={statusBarStyle !== 'dark' ? 'textWhite' : 'black'}
                    fontWeight="700"
                    width={28}
                  >
                    {trueIndex + 1}
                  </Text>
                  {selectedWords[slotIndex] && (
                    <Text
                      variant="body"
                      color={statusBarStyle !== 'dark' ? 'textWhite' : 'textSecondary'}
                      ml="s"
                    >
                      {selectedWords[slotIndex]}
                    </Text>
                  )}
                </Box>
              </TouchableOpacity>
            ))}
          </Box>

          {/* Word Bank Title */}
          <Text variant="body" fontWeight="700" color="textPrimary" mb="l">
            Tap a word below:
          </Text>

          {/* Word Bank Grid */}
          <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between" mb="l">
            {shuffledBank.map((word, i) => {
              const isSelected = selectedWords.includes(word);
              return (
                <TouchableOpacity
                  key={i}
                  disabled={isSelected}
                  onPress={() => handleSelectWord(word)}
                  style={{ width: itemWidth, marginBottom: theme.spacing.m }}
                  activeOpacity={0.7}
                >
                  <Box
                    height={52}
                    justifyContent="center"
                    alignItems="center"
                    backgroundColor={statusBarStyle === 'dark' ? 'text500' : 'gray900'}
                    borderColor={statusBarStyle === 'dark' ? 'text500' : 'gray900'}
                    borderWidth={1}
                    borderRadius={12}
                    opacity={isSelected ? 0.4 : 1}
                  >
                    <Text
                      variant="body"
                      color="textSecondary"
                      style={{ textDecorationLine: isSelected ? 'line-through' : 'none' }}
                    >
                      {word}
                    </Text>
                  </Box>
                </TouchableOpacity>
              );
            })}
          </Box>

          {/* Show Phrase Link */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ alignSelf: 'center', marginBottom: 20 }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text variant="body" color="primary700">
              Show my phrase again
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Verify Button - Always at Bottom */}
        <Box padding="m" mb="l" backgroundColor="mainBackground">
          <Button
            label="Verify"
            variant={isAllFilled ? 'primary' : 'disabled'}
            // onPress={isAllFilled ? handleVerify : ()=>{}}
            onPress={() => {
              router.navigate({
                pathname: '/(auth)/thank-you',
                params: {
                  title: isError ? 'Creating Wallet Setup Failed' : 'Your Smart Account is Ready',
                  subtext: isError
                    ? 'There was an error, try starting again.'
                    : 'Start using your secure Stellar wallet today',
                  buttonLabel: isError ? 'Try Again' : 'Go to Dashboard',
                  buttonFunction: isError ? '' : '/(onboarding)/get-started',
                  imageSource: isError ? 'error' : 'success',
                  accountAddress: 'CC3X7H9K...A9KF', // Usually populated dynamically
                },
              });
            }}
            bg={isAllFilled ? 'primary700' : 'btnDisabled'}
            labelColor={isAllFilled ? 'black' : 'gray600'}
            // disabled={!isAllFilled}
          />
        </Box>
      </View>
      <LoadingBlur visible={false} text="Getting your wallet ready..." />
    </Box>
  );
};

export default VerifyPhrase;
