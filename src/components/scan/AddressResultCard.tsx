import React from 'react';
import { TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';

interface AddressResultCardProps {
  address: string;
  onSend: () => void;
  onScanAgain: () => void;
}

const AddressResultCard = ({ address, onSend, onScanAgain }: AddressResultCardProps) => {
  return (
    <Box
      backgroundColor="cardbg"
      borderRadius={24}
      padding="m"
      width="90%"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      }}
    >
      <Text variant="p6" color="textPrimary" fontWeight="700" mb="m">
        Wallet Address
      </Text>
      
      <Box
        backgroundColor="bg900"
        borderRadius={12}
        padding="m"
        borderWidth={1}
        borderColor="gray900"
        mb="l"
      >
        <Text variant="p8" color="textPrimary" lineHeight={22}>
          {address}
        </Text>
      </Box>

      <TouchableOpacity activeOpacity={0.8} onPress={onSend} style={{ marginBottom: 12 }}>
        <Box
          height={56}
          backgroundColor="primary"
          borderRadius={28}
          justifyContent="center"
          alignItems="center"
        >
          <Text variant="p6" color="black" fontWeight="700">
            Send To This Address
          </Text>
        </Box>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.7} onPress={onScanAgain}>
        <Box
          height={56}
          backgroundColor="bg11"
          borderRadius={28}
          justifyContent="center"
          alignItems="center"
          borderWidth={1}
          borderColor="gray900"
        >
          <Text variant="p6" color="textPrimary" fontWeight="700">
            Scan Again
          </Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default AddressResultCard;
