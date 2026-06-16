import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Image } from 'expo-image';
import React from 'react';

interface Props {
  name: string;
  url: string;
  icon?: string;
}

export default function DappHeader({ name, url, icon }: Props) {
  return (
    <Box alignItems="center" mb="l">
      {icon ? (
        <Box
          width={64}
          height={64}
          borderRadius={16}
          overflow="hidden"
          mb="s"
          backgroundColor="gray100"
        >
          <Image source={{ uri: icon }} style={{ width: 64, height: 64 }} contentFit="cover" />
        </Box>
      ) : (
        <Box
          width={64}
          height={64}
          borderRadius={16}
          mb="s"
          backgroundColor="gray100"
          justifyContent="center"
          alignItems="center"
        >
          <Text variant="h6" color="textSecondary">
            {name[0]?.toUpperCase() ?? '?'}
          </Text>
        </Box>
      )}
      <Text variant="h10" color="textPrimary" fontFamily="SFproSemibold" textAlign="center">
        {name}
      </Text>
      <Text variant="p7" color="textSecondary" textAlign="center">
        {url}
      </Text>
    </Box>
  );
}
