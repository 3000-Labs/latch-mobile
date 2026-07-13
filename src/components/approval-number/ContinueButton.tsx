import Button from '@/src/components/shared/Button';
import React from 'react';

interface ContinueButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

const ContinueButton: React.FC<ContinueButtonProps> = ({ onPress, disabled = false }) => {
  return <Button label="Continue" disabled={disabled} onPress={onPress} />;
};

export default ContinueButton;
