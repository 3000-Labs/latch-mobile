import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { WELL_KNOWN_TOKENS, type TokenConfig } from '@/src/constants/known-tokens';
import { useTrackedTokens } from '@/src/hooks/use-tracked-tokens';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOKEN_ICONS: Record<string, ReturnType<typeof require>> = {
  USDC: require('@/src/assets/token/usdt.png'),
  USDT: require('@/src/assets/token/usdt.png'),
  ETH: require('@/src/assets/token/eth.png'),
};
const DEFAULT_TOKEN_ICON = require('@/src/assets/token/stellar.png');
const getTokenIcon = (code: string) => TOKEN_ICONS[code?.toUpperCase()] ?? DEFAULT_TOKEN_ICON;

function WellKnownTokenRow({
  token,
  tracked,
  onAdd,
  onRemove,
  isDark,
  theme,
}: {
  token: TokenConfig;
  tracked: boolean;
  onAdd: () => void;
  onRemove: () => void;
  isDark: boolean;
  theme: Theme;
}) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor={isDark ? 'gray900' : 'white'}
      padding="m"
      borderRadius={16}
      mb="s"
      style={
        !isDark
          ? { borderWidth: 1, borderColor: '#F5F5F5', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }
          : {}
      }
    >
      <Box
        width={44}
        height={44}
        borderRadius={22}
        backgroundColor={isDark ? 'black' : 'text400'}
        justifyContent="center"
        alignItems="center"
        mr="m"
      >
        <Box
          width={44}
          height={44}
          borderRadius={22}
          overflow="hidden"
          justifyContent="center"
          alignItems="center"
        >
          <Image
            source={getTokenIcon(token.code)}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
        </Box>
      </Box>
      <Box flex={1}>
        <Text variant="h11" color="textPrimary" fontWeight="700">{token.code}</Text>
        <Text variant="p8" color="textSecondary" mt="xs" numberOfLines={1}>
          {token.name}
        </Text>
      </Box>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={tracked ? onRemove : onAdd}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Box
          width={32}
          height={32}
          borderRadius={16}
          backgroundColor={tracked ? 'danger900' : 'primary700'}
          justifyContent="center"
          alignItems="center"
        >
          <Ionicons name={tracked ? 'remove' : 'add'} size={18} color="#000" />
        </Box>
      </TouchableOpacity>
    </Box>
  );
}

export default function AddToken() {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { tokens, addToken, removeToken, isTracked, loaded } = useTrackedTokens();

  const [customCode, setCustomCode] = useState('');
  const [customIssuer, setCustomIssuer] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const handleAddCustom = async () => {
    const code = customCode.trim().toUpperCase();
    const address = customIssuer.trim();

    if (!code) { setError('Asset code is required'); return; }

    const isGAddress = address.startsWith('G') && address.length === 56;
    const isCAddress = address.startsWith('C') && address.length === 56;

    if (!address || (!isGAddress && !isCAddress)) {
      setError('Enter a valid issuer (G...) or SAC contract address (C...)');
      return;
    }

    setError('');
    setAdding(true);

    if (isCAddress) {
      // Token identified by its SAC C-address — no issuer needed
      await addToken({ code, sacContractId: address, name: code });
    } else {
      // Token identified by classic issuer G-address
      await addToken({ code, issuer: address, name: code });
    }

    setCustomCode('');
    setCustomIssuer('');
    setAdding(false);
  };

  const inputStyle = [
    styles.input,
    {
      color: theme.colors.textPrimary,
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.gray100,
      borderColor: isDark ? theme.colors.gray800 : '#F0F0F0',
    },
  ];

  return (
    <Box flex={1} backgroundColor="mainBackground" style={{ paddingTop: insets.top }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <Box
        height={56}
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="m"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="h10" color="textPrimary" fontFamily="SFproSemibold">
          Manage Tokens
        </Text>
      </Box>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Popular tokens */}
          <Text variant="p7" color="textSecondary" fontWeight="600" mb="m" mt="s">
            POPULAR TOKENS
          </Text>

          {!loaded ? (
            <Box alignItems="center" py="l">
              <ActivityIndicator size="small" color={theme.colors.primary700} />
            </Box>
          ) : (
            WELL_KNOWN_TOKENS.map((token) => {
              const key = token.sacContractId ?? `${token.code}:${token.issuer}`;
              return (
                <WellKnownTokenRow
                  key={key}
                  token={token}
                  tracked={isTracked(token)}
                  onAdd={() => addToken(token)}
                  onRemove={() => removeToken(token)}
                  isDark={isDark}
                  theme={theme}
                />
              );
            })
          )}

          {/* Custom token */}
          <Text variant="p7" color="textSecondary" fontWeight="600" mb="m" mt="l">
            CUSTOM TOKEN
          </Text>

          <Box mb="s">
            <Text variant="p8" color="textSecondary" mb="xs">Asset Code</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. USDC"
              placeholderTextColor={theme.colors.textSecondary}
              value={customCode}
              onChangeText={(v) => { setCustomCode(v); setError(''); }}
              autoCapitalize="characters"
            />
          </Box>

          <Box mb="m">
            <Text variant="p8" color="textSecondary" mb="xs">Issuer (G...) or SAC Contract (C...)</Text>
            <TextInput
              style={[inputStyle, styles.issuerInput]}
              placeholder="G... or C..."
              placeholderTextColor={theme.colors.textSecondary}
              value={customIssuer}
              onChangeText={(v) => { setCustomIssuer(v); setError(''); }}
              autoCapitalize="characters"
              multiline
            />
          </Box>

          {error ? (
            <Text variant="p8" color="danger900" mb="m">{error}</Text>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleAddCustom}
            disabled={adding}
          >
            <Box
              backgroundColor="primary700"
              borderRadius={16}
              paddingVertical="m"
              alignItems="center"
              opacity={adding ? 0.6 : 1}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text variant="h11" color="black" fontWeight="700">Add Token</Text>
              )}
            </Box>
          </TouchableOpacity>

          {/* Currently tracked */}
          {tokens.length > 0 && (
            <>
              <Text variant="p7" color="textSecondary" fontWeight="600" mb="m" mt="l">
                YOUR TOKENS
              </Text>
              {tokens.map((token) => {
                const key = token.sacContractId ?? `${token.code}:${token.issuer}`;
                const subtitle = token.sacContractId ?? token.issuer ?? '';
                return (
                  <Box
                    key={key}
                    flexDirection="row"
                    alignItems="center"
                    backgroundColor={isDark ? 'gray900' : 'white'}
                    padding="m"
                    borderRadius={16}
                    mb="s"
                    style={!isDark ? { borderWidth: 1, borderColor: '#F5F5F5' } : {}}
                  >
                    <Box flex={1}>
                      <Text variant="h11" color="textPrimary" fontWeight="700">{token.code}</Text>
                      <Text variant="p8" color="textSecondary" mt="xs" numberOfLines={1}>
                        {subtitle}
                      </Text>
                    </Box>
                    <TouchableOpacity
                      onPress={() => removeToken(token)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.colors.danger900} />
                    </TouchableOpacity>
                  </Box>
                );
              })}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 16,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'SFproRegular',
  },
  issuerInput: {
    height: 72,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
});
