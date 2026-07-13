import MemberStatusBadge from '@/src/components/add-members/MemberStatusBadge';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

interface SelfMemberReviewCardProps {
  email?: string | null;
}

const SelfMemberReviewCard: React.FC<SelfMemberReviewCardProps> = ({ email }) => {
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
      <Box ml="s" flex={1}>
        <Text variant="p5" fontWeight="700" color="textPrimary">
          You (this device)
        </Text>
        {email ? (
          <Text variant="p7" color="textSecondary" mt="xs">
            {email}
          </Text>
        ) : null}
      </Box>
      <MemberStatusBadge status="added" />
    </Box>
  );
};

export default SelfMemberReviewCard;
