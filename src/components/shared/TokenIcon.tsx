import { Image } from 'expo-image';
import React, { useState } from 'react';
import Box from './Box';

const STELLAR_FALLBACK = require('@/src/assets/token/stellar.png');

interface TokenIconProps {
  iconUrl?: string | null;
  size?: number;
}

const TokenIcon = ({ iconUrl, size = 48 }: TokenIconProps) => {
  const [errored, setErrored] = useState(false);
  const radius = size / 2;

  return (
    <Box
      width={size}
      height={size}
      borderRadius={radius}
      overflow="hidden"
      justifyContent="center"
      alignItems="center"
    >
      <Image
        source={!errored && iconUrl ? { uri: iconUrl } : STELLAR_FALLBACK}
        style={{ width: size + 5, height: size + 5 }}
        contentFit="cover"
        onError={() => setErrored(true)}
      />
    </Box>
  );
};

export default TokenIcon;
