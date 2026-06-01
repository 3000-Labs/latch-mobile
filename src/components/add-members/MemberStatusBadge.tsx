import Text from '@/src/components/shared/Text';
import React from 'react';
import { View } from 'react-native';

interface MemberStatusBadgeProps {
  status: 'pending' | 'added';
}

const CONFIG = {
  pending: {
    label: 'Pending',
    color: '#FFAD00',
    bg: 'rgba(255, 173, 0, 0.12)',
  },
  added: {
    label: 'Added',
    color: '#00C735',
    bg: 'rgba(0, 199, 53, 0.12)',
  },
};

const MemberStatusBadge: React.FC<MemberStatusBadgeProps> = ({ status }) => {
  const { label, color, bg } = CONFIG[status];

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text variant="p8" fontWeight="600" style={{ color, fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
};

export default MemberStatusBadge;
