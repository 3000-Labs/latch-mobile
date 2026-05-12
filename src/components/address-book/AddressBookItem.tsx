import React from 'react';
import { Image } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';

interface AddressBookItemProps {
  label: string;
  address: string;
}

const AddressBookItem = ({ label, address }: AddressBookItemProps) => {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor="bg11"
      borderRadius={16}
      padding="m"
      mb="s"
    >
      <Box
        width={40}
        height={40}
        borderRadius={10}
        backgroundColor="primary"
        justifyContent="center"
        alignItems="center"
        mr="m"
      >
        <Image
          source={require('@/src/assets/icon/yellow-user.png')}
          style={{ width: 40, height: 40, borderRadius: 10 }}
        />
      </Box>
      <Box>
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {label}
        </Text>
        <Text variant="p8" color="textSecondary" mt="xs">
          {address.slice(0, 8)}...{address.slice(-4)}
        </Text>
      </Box>
    </Box>
  );
};

export default AddressBookItem;
