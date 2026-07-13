import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';
import MemberReviewCard from './MemberReviewCard';
import SelfMemberReviewCard from './SelfMemberReviewCard';

interface Member {
  id: string;
  name: string;
  value: string;
  status: 'pending' | 'added';
}

interface MemberReviewListProps {
  members: Member[];
  selfEmail?: string | null;
}

const MemberReviewList: React.FC<MemberReviewListProps> = ({ members, selfEmail }) => {
  return (
    <Box mb="l">
      <Text variant="p5" fontWeight="700" color="textPrimary" mb="s">
        Members
      </Text>
      <SelfMemberReviewCard email={selfEmail} />
      {members.map((member) => (
        <MemberReviewCard key={member.id} name={member.name} status={member.status} />
      ))}
    </Box>
  );
};

export default MemberReviewList;
