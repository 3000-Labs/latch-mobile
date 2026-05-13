import { type TokenConfig } from '@/src/constants/known-tokens';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Box from '../shared/Box';
import Text from '../shared/Text';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (token: Omit<TokenConfig, 'name'> & { name: string }) => Promise<void>;
}

const AddCustomTokenSheet = ({ visible, onClose, onAdd }: Props) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const translateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setError('');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 500,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const handleClose = () => {
    setCode('');
    setAddress('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedAddress = address.trim();

    if (!trimmedCode) {
      setError('Asset code is required');
      return;
    }

    const isGAddress = trimmedAddress.startsWith('G') && trimmedAddress.length === 56;
    const isCAddress = trimmedAddress.startsWith('C') && trimmedAddress.length === 56;

    if (!trimmedAddress || (!isGAddress && !isCAddress)) {
      setError('Enter a valid issuer (G...) or SAC contract address (C...)');
      return;
    }

    setError('');
    setAdding(true);

    await onAdd(
      isCAddress
        ? { code: trimmedCode, sacContractId: trimmedAddress, name: trimmedCode }
        : { code: trimmedCode, issuer: trimmedAddress, name: trimmedCode },
    );

    setAdding(false);
    setCode('');
    setAddress('');
    handleClose();
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
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop — fills space above the sheet */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Sheet — sits at bottom of flex column, rises with keyboard */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? theme.colors.gray900 : theme.colors.white,
              paddingBottom: insets.bottom + 24,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle */}
          <Box alignItems="center" pt="m" pb="s">
            <Box width={36} height={4} borderRadius={2} backgroundColor="gray800" />
          </Box>

          {/* Header */}
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal="m"
            mb="l"
          >
            <Text variant="h10" color="textPrimary" fontWeight="700">
              Add Custom Token
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Box>

          <Box paddingHorizontal="m">
            <Box mb="m">
              <Text variant="p8" color="textSecondary" mb="xs">
                Asset Code
              </Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. USDC"
                placeholderTextColor={theme.colors.textSecondary}
                value={code}
                onChangeText={(v) => { setCode(v); setError(''); }}
                autoCapitalize="characters"
              />
            </Box>

            <Box mb="m">
              <Text variant="p8" color="textSecondary" mb="xs">
                Issuer (G...) or SAC Contract (C...)
              </Text>
              <TextInput
                style={[inputStyle, styles.addressInput]}
                placeholder="G... or C..."
                placeholderTextColor={theme.colors.textSecondary}
                value={address}
                onChangeText={(v) => { setAddress(v); setError(''); }}
                autoCapitalize="characters"
                multiline
              />
            </Box>

            {error ? (
              <Text variant="p8" color="danger900" mb="m">
                {error}
              </Text>
            ) : null}

            <TouchableOpacity activeOpacity={0.85} onPress={handleSubmit} disabled={adding}>
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
                  <Text variant="h11" color="black" fontWeight="700">
                    Add Token
                  </Text>
                )}
              </Box>
            </TouchableOpacity>
          </Box>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  kav: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'SFproRegular',
  },
  addressInput: {
    height: 72,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
});

export default AddCustomTokenSheet;
