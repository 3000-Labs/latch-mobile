import Box from '@/src/components/shared/Box';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useState } from 'react';
import { TextInput, TextInputProps, TouchableOpacity } from 'react-native';

interface Props extends TextInputProps {
  showPasswordToggle?: boolean;
  status?: 'danger' | 'basic';
  rightElement?: React.ReactNode;
}

const Input: React.FC<Props> = ({
  showPasswordToggle,
  secureTextEntry,
  status,
  onFocus,
  onBlur,
  rightElement,
  ...props
}) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      height={56}
      borderRadius={14}
      paddingHorizontal="m"
      backgroundColor="bg11"
      borderWidth={1}
      borderColor={
        status === 'danger'
          ? 'inputError'
          : isFocused
            ? 'primary700'
            : isDark
              ? 'gray800'
              : 'gray400'
      }
    >
      <TextInput
        {...props}
        secureTextEntry={secureTextEntry && !isPasswordVisible}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        placeholderTextColor={theme.colors.gray600}
        style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 16, padding: 0 }}
      />
      {rightElement}
      {showPasswordToggle && secureTextEntry && (
        <TouchableOpacity
          onPress={() => setIsPasswordVisible((v) => !v)}
          style={{ paddingLeft: 8 }}
        >
          <Ionicons
            name={isPasswordVisible ? 'lock-open-outline' : 'lock-closed-outline'}
            size={20}
            color={theme.colors.gray500}
          />
        </TouchableOpacity>
      )}
    </Box>
  );
};

export default Input;
