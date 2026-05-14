import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';
import { Image } from 'react-native';

interface TransactionTimelineProps {
  date: string;
}

const TransactionTimeline = ({ date }: TransactionTimelineProps) => {
  const steps = [
    { label: 'Transaction\ninitiated' },
    { label: 'Submitted to\nnetwork' },
    { label: 'Confirmed on\nledger' },
  ];

  return (
    <Box alignItems="center" mb="xl" px="m">
      <Box width="100%" px="xl" position="relative" justifyContent="center" height={40}>
        {/* Continuous Line */}
        <Box
          position="absolute"
          height={2}
          backgroundColor="primary700"
          width="70%"
          style={{ alignSelf: 'center', top: 20 }}
        />

        {/* Stars */}
        <Box flexDirection="row" justifyContent="space-between" width="100%" px="s">
          {steps.map((_, index) => (
            <Box key={index} backgroundColor="mainBackground" borderRadius={16} padding="xs">
              <Image
                source={require('@/src/assets/icon/star.png')}
                style={{ width: 28, height: 28 }}
                resizeMode="contain"
              />
            </Box>
          ))}
        </Box>
      </Box>

      <Box flexDirection="row" width="100%" justifyContent="space-between" mt="m">
        {steps.map((step, index) => (
          <Box key={index} alignItems="center" style={{ width: '33.3%' }}>
            <Text
              variant="h12"
              color="textPrimary"
              textAlign="center"
              fontWeight="600"
              lineHeight={16}
            >
              {step.label}
            </Text>
            <Text variant="p8" color="textSecondary" mt="xs" textAlign="center">
              {date}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default TransactionTimeline;
