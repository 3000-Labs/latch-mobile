import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';

interface Permission {
  id: string;
  name: string;
  duration: string;
  spendingLimit: string;
  allowedActions: string[];
}

interface Props {
  permission: Permission;
}

const ACTION_MAP: Record<string, string> = {
  transfer: 'Transfer',
  swap: 'Swap',
  offers: 'Offers',
};

const PermissionItem = ({ permission }: Props) => {
  return (
    <Box backgroundColor="bg11" borderRadius={16} padding="m" mb="m">
      <Text variant="h11" color="textPrimary" fontWeight="700" mb="s">
        {permission.name}
      </Text>

      {/* Action Chips */}
      <Box flexDirection="row" flexWrap="wrap" mb="m">
        {permission.allowedActions.map((id) => (
          <Box key={id} bg="labelBg" paddingHorizontal="m" py="xs" borderRadius={8} mr="xs" mb="xs">
            <Text variant="p7" color="primary" fontWeight="700">
              {ACTION_MAP[id] || id}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Details Row */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box flex={1} mr="s">
          <Text variant="h11" color="textPrimary" fontWeight="700" mb="s">
            Expires
          </Text>
          <Box backgroundColor="btnDisabled" borderRadius={12} padding="m">
            <Text variant="p6" color="textTertiary">
              {permission.duration}
            </Text>
          </Box>
        </Box>

        <Box flex={1.2}>
          <Text variant="h11" color="textPrimary" fontWeight="700" mb="s">
            Limit
          </Text>
          <Box
            backgroundColor="btnDisabled"
            borderRadius={12}
            padding="m"
            flexDirection="row"
            justifyContent="space-between"
          >
            <Text variant="p6" color="textTertiary">
              {permission.spendingLimit}
            </Text>
            <Text variant="p6" color="textTertiary">
              USDC
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PermissionItem;
