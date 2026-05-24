import React from 'react';
import Button from '../shared/Button';

interface ContinueButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

const ContinueButton: React.FC<ContinueButtonProps> = ({ onPress, disabled = false }) => {
  return <Button label="Continue" disabled={disabled} onPress={onPress} />;
};

export default ContinueButton;
