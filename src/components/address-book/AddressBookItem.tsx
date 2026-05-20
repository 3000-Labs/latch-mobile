import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { Image, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

interface AddressBookItemProps {
  label: string;
  address: string;
  onDelete?: () => void;
}

const AddressBookItem = ({ label, address, onDelete }: AddressBookItemProps) => {
  const theme = useTheme<Theme>();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor="bg11"
      borderRadius={16}
      padding="m"
      mb="s"
    >
      <Box width={40} height={40} borderRadius={10} mr="m" overflow="hidden">
        <Image
          source={require('@/src/assets/icon/yellow-user.png')}
          style={{ width: 40, height: 40, borderRadius: 10 }}
        />
      </Box>
      <Box flex={1}>
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {label}
        </Text>
        <Text variant="p8" color="textSecondary" mt="xs">
          {address.slice(0, 8)}...{address.slice(-4)}
        </Text>
      </Box>
      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.inputError} />
        </TouchableOpacity>
      )}
    </Box>
  );
};

export default AddressBookItem;
