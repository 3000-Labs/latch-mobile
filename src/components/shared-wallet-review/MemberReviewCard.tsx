import MemberStatusBadge from '@/src/components/add-members/MemberStatusBadge';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

interface MemberReviewCardProps {
  name: string;
  status: 'pending' | 'added';
}

const MemberReviewCard: React.FC<MemberReviewCardProps> = ({ name, status }) => {
  return (
    <Box
      backgroundColor="bg11"
      borderRadius={12}
      px="m"
      py="m"
      flexDirection="row"
      alignItems="center"
      mb="s"
    >
      <Ionicons name="person-outline" size={20} color="#8E8E93" />
      <Text variant="p5" fontWeight="700" color="textPrimary" ml="s" flex={1}>
        {name}
      </Text>
      <MemberStatusBadge status={status} />
    </Box>
  );
};

export default MemberReviewCard;
