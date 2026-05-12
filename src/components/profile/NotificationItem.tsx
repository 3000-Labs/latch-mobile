import React from 'react';

import Box from '@/src/components/shared/Box';
import Switch from '@/src/components/shared/Switch';
import Text from '@/src/components/shared/Text';

interface NotificationItemProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}

const NotificationItem = ({
  title,
  description,
  value,
  onValueChange,
}: NotificationItemProps) => (
  <Box
    flexDirection="row"
    alignItems="center"
    backgroundColor="bg11"
    borderRadius={16}
    padding="m"
    mb="s"
  >
    <Box flex={1} mr="m">
      <Text variant="h11" color="textPrimary" fontWeight="700">
        {title}
      </Text>
      <Text variant="p8" color="textSecondary" mt="xs" lineHeight={18}>
        {description}
      </Text>
    </Box>
    <Switch value={value} onValueChange={onValueChange} />
  </Box>
);

export default NotificationItem;
