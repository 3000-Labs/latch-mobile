import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

interface AccountSheetHeaderProps {
  onClose: () => void;
  onAdd: () => void;
}

const AccountSheetHeader = ({ onClose, onAdd }: AccountSheetHeaderProps) => {
  const theme = useTheme<Theme>();

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal="m"
      py="m"
      mb="s"
    >
      <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>

      <Text variant="h9" color="textPrimary" fontWeight="700">
        Accounts
      </Text>

      <TouchableOpacity onPress={onAdd} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </Box>
  );
};

export default AccountSheetHeader;
