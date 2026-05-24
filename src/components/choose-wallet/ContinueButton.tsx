import { useAppTheme } from '@/src/theme/ThemeContext';
import React from 'react';
import { StyleSheet } from 'react-native';
import Button from '../shared/Button';

interface ContinueButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

const ContinueButton: React.FC<ContinueButtonProps> = ({ onPress, disabled = false }) => {
  const { isDark } = useAppTheme();
  return <Button label="Continue" disabled={disabled} onPress={onPress} />;
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28, // fully rounded like in the mockup bottom section
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
  },
});

export default ContinueButton;
