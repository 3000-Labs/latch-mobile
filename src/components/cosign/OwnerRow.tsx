import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface Props {
  /** Display name: "You", a nickname, or a truncated address. */
  label: string;
  isYou: boolean;
  approved: boolean;
  /** Present only for editable (non-self) owners — taps open the nickname editor. */
  onEditNickname?: () => void;
}

/**
 * One owner row on the approval screen: avatar, name (with an edit pencil for
 * co-signers you can nickname), and an Approved/Pending status pill. Status is
 * conveyed by icon + label + color (not color alone) for accessibility.
 */
const OwnerRow: React.FC<Props> = ({ label, isYou, approved, onEditNickname }) => {
  const theme = useTheme<Theme>();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor="bg11"
      borderRadius={16}
      px="m"
      py="m"
      mb="s"
    >
      <Box
        width={36}
        height={36}
        borderRadius={18}
        backgroundColor="cardbg"
        justifyContent="center"
        alignItems="center"
        mr="m"
      >
        <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
      </Box>

      <Box flex={1} flexDirection="row" alignItems="center">
        <Text variant="p6" color="textPrimary" fontFamily="SFproSemibold" numberOfLines={1}>
          {label}
        </Text>
        {!isYou && onEditNickname && (
          <TouchableOpacity onPress={onEditNickname} hitSlop={10} style={{ marginLeft: 8 }}>
            <Ionicons name="pencil" size={13} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </Box>

      <Box
        flexDirection="row"
        alignItems="center"
        backgroundColor={approved ? 'success50' : 'bg50'}
        borderRadius={12}
        px="s"
        py="xs"
      >
        <Ionicons
          name={approved ? 'checkmark-circle' : 'ellipse-outline'}
          size={13}
          color={approved ? theme.colors.success900 : theme.colors.bg900}
          style={{ marginRight: 4 }}
        />
        <Text variant="p8" color={approved ? 'success900' : 'bg900'} style={{ fontWeight: '600' }}>
          {approved ? 'Approved' : 'Pending'}
        </Text>
      </Box>
    </Box>
  );
};

export default OwnerRow;
