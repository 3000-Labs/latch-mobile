import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import type { SessionKey } from '@/src/store/permissions';
import { useAppTheme } from '@/src/theme/ThemeContext';
import React from 'react';

interface Props {
  permission: SessionKey;
}

const ACTION_MAP: Record<string, string> = {
  transfer: 'Transfer',
  swap: 'Swap',
  offers: 'Offers',
};

function expiryLabel(permission: SessionKey): string {
  if (Date.now() > permission.expiresAt) return 'Expired';
  return permission.durationLabel;
}

const PermissionItem = ({ permission }: Props) => {
  const { isDark } = useAppTheme();
  const expired = Date.now() > permission.expiresAt;
  return (
    <Box backgroundColor="bg11" borderRadius={16} padding="m" mb="m">
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="s">
        <Text variant="h11" color="textPrimary" fontWeight="700">
          {permission.name}
        </Text>
        {expired && (
          <Box backgroundColor="btnDisabled" paddingHorizontal="m" py="xs" borderRadius={8}>
            <Text variant="p7" color="textTertiary" fontWeight="700">
              Expired
            </Text>
          </Box>
        )}
      </Box>

      {/* Action Chips */}
      <Box flexDirection="row" flexWrap="wrap" mb="m">
        {permission.allowedActions.map((id) => (
          <Box key={id} bg={isDark ? 'labelBg' : 'primary50'} paddingHorizontal="m" py="xs" borderRadius={8} mr="xs" mb="xs">
            <Text variant="p7" color={isDark ? 'primary' : 'primary800'} fontWeight="700">
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
              {expiryLabel(permission)}
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
              {permission.spendingLimitAsset}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PermissionItem;
