import React from 'react';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';

interface AccountSectionHeaderProps {
  label: string;
  count: number;
}

const AccountSectionHeader = ({ label, count }: AccountSectionHeaderProps) => (
  <Box flexDirection="row" alignItems="center" gap="xs" mt="s" mb="s">
    <Text
      variant="p8"
      color="textTertiary"
      fontWeight="600"
      style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
    >
      {label}
    </Text>
    <Text variant="p8" color="textTertiary">
      · {count}
    </Text>
  </Box>
);

export default AccountSectionHeader;
