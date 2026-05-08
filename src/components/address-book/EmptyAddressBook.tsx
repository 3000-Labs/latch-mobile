import React from 'react';
import { TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Image } from 'react-native';

interface EmptyAddressBookProps {
  onAdd: () => void;
}

const EmptyAddressBook = ({ onAdd }: EmptyAddressBookProps) => {
  return (
    <Box flex={1} alignItems="center" paddingHorizontal="xl">
      <Image
        source={require('@/src/assets/images/empty.png')}
        style={{ width: 186, height: 156, marginTop: 130 }}
        resizeMode="contain"
      />

      <Text variant="h7" color="textPrimary" fontWeight="700" textAlign="center" mb="xs">
        Empty Address Book
      </Text>
      <Text variant="p6" color="textPrimary" textAlign="center" lineHeight={24}>
        Tap the "Add Address" button to start saving your frequently used addresses.
      </Text>
      <Box position="absolute" bottom={40} width="100%">
        <TouchableOpacity activeOpacity={0.8} onPress={onAdd}>
          <Box
            height={56}
            backgroundColor="primary"
            borderRadius={28}
            justifyContent="center"
            alignItems="center"
          >
            <Text variant="p6" color="black" fontWeight="700">
              Add Address
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default EmptyAddressBook;
