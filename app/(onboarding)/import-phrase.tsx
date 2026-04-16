import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import LoadingBlur from '@/src/components/shared/LoadingBlur';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const { width } = Dimensions.get('window');

const ImportPhrase = () => {
  const theme = useTheme<Theme>();
  const router = useRouter();
  const [words, setWords] = useState<string[]>(Array(12).fill(''));

  const inputsRef = useRef<(TextInput | null)[]>([]);
  const scrollRef = useRef<ScrollView | null>(null);

  const itemWidth = (width - theme.spacing.m * 2 - theme.spacing.m) / 2; // two columns with gap = m

  const handleChange = (text: string, idx: number) => {
    // If user pasted multiple words into one field, split and distribute
    const trimmed = text.trim();
    if (trimmed.includes(' ')) {
      const parts = trimmed.split(/\s+/);
      const next = [...words];
      let i = idx;
      for (const p of parts) {
        if (i >= next.length) break;
        next[i] = p;
        i += 1;
      }
      setWords(next);
      // focus the next empty input after the pasted words
      const focusIdx = i < next.length ? i : next.length - 1;
      setTimeout(() => inputsRef.current[focusIdx]?.focus(), 50);
      return;
    }

    // Otherwise just update the current field. Do not auto-advance on single character.
    const next = [...words];
    next[idx] = text;
    setWords(next);
  };

  const handleFocus = (idx: number) => {
    // measure the input position and scroll so it's visible above the keyboard
    setTimeout(() => {
      const input = inputsRef.current[idx];
      if (!input || !scrollRef.current) return;

      try {
        // @ts-ignore - measure exists on TextInput refs
        input.measure((fx: number, fy: number, w: number, h: number, px: number, py: number) => {
          // py is the Y coordinate in screen pixels; scroll to slightly above it
          const offset = 140; // pixels above keyboard
          const target = Math.max(0, py - offset);
          scrollRef.current?.scrollTo({ y: target, animated: true });
        });
      } catch (_) {
        // ignore measurement errors
      }
    }, 300);
  };

  const allFilled = words.every((w) => w.trim().length > 0);

  const handleImport = () => {
    if (!allFilled) return;
    Keyboard.dismiss();
    // Proceed - keep simple for now
    router.push('/(onboarding)/set-pin');
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 100}
        style={{ flex: 1 }}
      >
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ref={(r) => {
            scrollRef.current = r;
          }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.m,
            paddingBottom: 40,
            paddingTop: 60,
            flexGrow: 1,
          }}
        >
          {/* Header */}
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

          <Box alignItems="center" mb="l">
            <Text variant="h7" fontSize={32} textAlign="center">
              Import Your Recovery Phrase
            </Text>
            <Text variant="p5" color="textSecondary" mt="xs" textAlign="center" width={'85%'}>
              Enter your 12-word recovery phrase in the correct order
            </Text>
          </Box>

          {/* Grid of inputs */}
          <Box gap="s">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s }}>
              {words.map((word, index) => (
                <View
                  key={index}
                  style={[
                    styles.item,
                    {
                      width: itemWidth,
                      backgroundColor: '#111',
                      borderRadius: 12,
                      borderColor: theme.colors.gray800,
                    },
                  ]}
                >
                  <Text variant="caption" color="textSecondary" style={{ marginRight: 8 }}>
                    {index + 1}
                  </Text>
                  <TextInput
                    ref={(el) => {
                      inputsRef.current[index] = el;
                    }}
                    value={word}
                    onChangeText={(t) => handleChange(t, index)}
                    onFocus={() => handleFocus(index)}
                    placeholder={`word ${index + 1}`}
                    placeholderTextColor={theme.colors.gray600}
                    style={{
                      color: theme.colors.textPrimary,
                      flex: 1,
                      padding: 0,
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType={index === words.length - 1 ? 'done' : 'next'}
                    onSubmitEditing={() => {
                      if (inputsRef.current[index + 1]) inputsRef.current[index + 1]?.focus();
                    }}
                  />
                </View>
              ))}
            </View>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Import Button fixed at bottom */}
      <Box padding="m" mb="l" backgroundColor="mainBackground">
        <Button
          label="Import Wallet"
          variant={allFilled ? 'primary' : 'disabled'}
          //   onPress={handleImport}
          onPress={() => router.push('/(onboarding)/set-pin')}
          bg={allFilled ? 'primary700' : 'btnDisabled'}
          labelColor={allFilled ? 'black' : 'gray600'}
          //   disabled={!allFilled}
        />
      </Box>
      <LoadingBlur visible={false} text="Verifying..." />
    </Box>
  );
};

const styles = StyleSheet.create({
  item: {
    height: 56,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ImportPhrase;
