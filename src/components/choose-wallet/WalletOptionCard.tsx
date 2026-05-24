import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface WalletOptionCardProps {
  title: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
}

const WalletOptionCard: React.FC<WalletOptionCardProps> = ({
  title,
  description,
  isSelected,
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ width: '100%' }}>
      <Box
        backgroundColor="bg11" // Custom background (often #1D1D1D or similar)
        borderRadius={16}
        padding="m"
        borderWidth={1.5}
        borderColor={isSelected ? 'primary700' : 'transparent'}
        style={{
          // Extra styles to perfectly match the mockup's premium dark gray color `#1C1C1E`
          // backgroundColor: '#1C1C1E',
          minHeight: 88,
          justifyContent: 'center',
        }}
      >
        <Box>
          <Text variant="h10" color="textPrimary" fontWeight="bold" fontSize={18} mb="xs">
            {title}
          </Text>
          <Text variant="p7" color="textSecondary" fontSize={14}>
            {description}
          </Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default WalletOptionCard;
