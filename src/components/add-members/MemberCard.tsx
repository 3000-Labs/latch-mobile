import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import MemberStatusBadge from './MemberStatusBadge';

interface MemberCardProps {
  name: string;
  status: 'pending' | 'added';
  onRemove: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ name, status, onRemove }) => {
  const theme = useTheme<Theme>();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor="bg11"
      mb="m"
      style={{ borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14 }}
    >
      {/* Avatar icon */}
      <Box
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: '#2A2A2A',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name="person-outline" size={18} color={theme.colors.gray500} />
      </Box>

      {/* Name + badge */}
      <Box flex={1} flexDirection="row" alignItems="center" gap="s">
        <Text variant="h10" color="textPrimary" fontWeight="700">
          {name}
        </Text>
        <MemberStatusBadge status={status} />
      </Box>

      {/* Remove button */}
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={18} color={theme.colors.gray600} />
      </TouchableOpacity>
    </Box>
  );
};

export default MemberCard;
