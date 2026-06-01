import Button from '@/src/components/shared/Button';
import React from 'react';

interface CreateWalletButtonProps {
  onPress: () => void;
  loading?: boolean;
}

const CreateWalletButton: React.FC<CreateWalletButtonProps> = ({ onPress, loading }) => {
  return <Button label="Create Shared Wallet" onPress={onPress} loading={loading} />;
};

export default CreateWalletButton;
