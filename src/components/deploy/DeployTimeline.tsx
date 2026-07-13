import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { ActivityIndicator } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

export type StepStatus = 'done' | 'active' | 'pending' | 'error';

export interface DeployStep {
  label: string;
  status: StepStatus;
  caption?: string;
}

interface Props {
  steps: DeployStep[];
  // When reduced motion is on, the active step shows a static dot instead of a spinner.
  reduceMotion?: boolean;
}

const INDICATOR = 28;

const StepIndicator = ({
  status,
  reduceMotion,
}: {
  status: StepStatus;
  reduceMotion?: boolean;
}) => {
  const theme = useTheme<Theme>();

  if (status === 'done') {
    return (
      <Box
        width={INDICATOR}
        height={INDICATOR}
        borderRadius={INDICATOR / 2}
        backgroundColor="primary700"
        justifyContent="center"
        alignItems="center"
      >
        <Ionicons name="checkmark" size={16} color={theme.colors.black} />
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box
        width={INDICATOR}
        height={INDICATOR}
        borderRadius={INDICATOR / 2}
        backgroundColor="danger900"
        justifyContent="center"
        alignItems="center"
      >
        <Ionicons name="close" size={16} color={theme.colors.textWhite} />
      </Box>
    );
  }

  if (status === 'active') {
    return (
      <Box
        width={INDICATOR}
        height={INDICATOR}
        // borderRadius={INDICATOR / 2}
        // borderWidth={2}
        // borderColor="primary700"
        justifyContent="center"
        alignItems="center"
      >
        {reduceMotion ? (
          <Box width={10} height={10} borderRadius={5} backgroundColor="primary700" />
        ) : (
          <ActivityIndicator size="small" color={theme.colors.primary700} />
        )}
      </Box>
    );
  }

  // pending
  return (
    <Box
      width={INDICATOR}
      height={INDICATOR}
      borderRadius={INDICATOR / 2}
      borderWidth={2}
      borderColor="gray800"
    />
  );
};

const DeployTimeline = ({ steps, reduceMotion }: Props) => {
  return (
    <Box>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const connectorColor = step.status === 'done' ? 'primary700' : 'gray800';

        return (
          <Box key={step.label} flexDirection="row">
            <Box alignItems="center" width={INDICATOR}>
              <StepIndicator status={step.status} reduceMotion={reduceMotion} />
              {!isLast && (
                <Box width={2} height={28} backgroundColor={connectorColor} marginTop="xs" />
              )}
            </Box>

            <Box marginLeft="m" flex={1} marginBottom={isLast ? 'none' : 'm'}>
              <Text
                variant="h11"
                fontWeight="700"
                color={step.status === 'pending' ? 'textSecondary' : 'textPrimary'}
              >
                {step.label}
              </Text>
              {step.caption ? (
                <Text variant="p7" color="textSecondary" mt="xs">
                  {step.caption}
                </Text>
              ) : null}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default DeployTimeline;
