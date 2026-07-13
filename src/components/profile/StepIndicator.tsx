import Box from '@/src/components/shared/Box';
import React from 'react';

interface Props {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator = ({ currentStep, totalSteps }: Props) => {
  return (
    <Box flexDirection="row" alignItems="center">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <Box
          key={index}
          width={index + 1 <= currentStep ? 14 : 6}
          height={6}
          borderRadius={3}
          backgroundColor={index + 1 <= currentStep ? 'primary' : 'gray800'}
          marginLeft={index === 0 ? 'none' : 'xs'}
        />
      ))}
    </Box>
  );
};

export default StepIndicator;
