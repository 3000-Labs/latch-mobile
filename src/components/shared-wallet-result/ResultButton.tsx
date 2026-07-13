import Button from '@/src/components/shared/Button';
import React from 'react';

interface ResultButtonProps {
  success: boolean;
  onPress: () => void;
}

const ResultButton: React.FC<ResultButtonProps> = ({ success, onPress }) => {
  return <Button label={success ? 'Go to Wallet' : 'Try Again'} onPress={onPress} />;
};

export default ResultButton;
