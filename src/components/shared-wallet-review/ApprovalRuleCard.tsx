import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { useAppTheme } from '@/src/theme/ThemeContext';
import React from 'react';

interface ApprovalRuleCardProps {
  approvals: number;
  total: number;
}

const ApprovalRuleCard: React.FC<ApprovalRuleCardProps> = ({ approvals, total }) => {
  const { isDark } = useAppTheme();

  return (
    <Box mb="l">
      <Text variant="p5" fontWeight="700" color="textPrimary" mb="s">
        Approval Rule
      </Text>
      <Box backgroundColor="bg11" borderRadius={16} py="m" px="m" alignItems="center">
        <Box flexDirection="row" alignItems="center" justifyContent="center" mb="xs">
          <Text
            style={{
              fontSize: 56,
              lineHeight: 64,
              fontFamily: 'SFproBold',
              color: isDark ? '#FFFFFF' : '#000000',
            }}
          >
            {approvals}
          </Text>
          <Text variant="p5" color="textSecondary" style={{ marginBottom: 8, marginHorizontal: 6 }}>
            of
          </Text>
          <Text
            style={{
              fontSize: 56,
              lineHeight: 64,
              fontFamily: 'SFproBold',
              color: isDark ? '#FFFFFF' : '#000000',
            }}
          >
            {total}
          </Text>
        </Box>
        <Text variant="p7" color="textSecondary" textAlign="center">
          approvals required
        </Text>
      </Box>
    </Box>
  );
};

export default ApprovalRuleCard;
