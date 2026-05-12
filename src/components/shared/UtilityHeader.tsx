import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

interface UtilityHeaderProps {
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
  showHandle?: boolean;
}

const UtilityHeader = ({ title, onBack, rightElement, showHandle = true }: UtilityHeaderProps) => {
  const theme = useTheme<Theme>();

  return (
    <Box>
      {showHandle && <BottomSheetHandle />}
      <Box
        height={56}
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="m"
      >
        <TouchableOpacity onPress={onBack} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text variant="h10" color="textPrimary" fontWeight="700">
          {title}
        </Text>
        <Box width={40} alignItems="flex-end">
          {rightElement}
        </Box>
      </Box>
    </Box>
  );
};

export default UtilityHeader;
