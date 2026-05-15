import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';

interface Props {
  values: {
    name: string;
    duration: string;
    spendingLimit: string;
    allowedActions: string[];
  };
  onSubmit: () => void;
}

const ACTION_MAP: Record<string, string> = {
  transfer: 'Transfer',
  swap: 'Swap',
  offers: 'Offers',
};

const SessionKeyStep3 = ({ values, onSubmit }: Props) => {
  return (
    <Box flex={1}>
      <ScrollView
        bounces={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* Summary Card */}
        <Box backgroundColor="bg11" borderRadius={16} padding="m" mb="l">
          <Box flexDirection="row" justifyContent="space-between" mb="m">
            <Text variant="p7" color="textSecondary">
              Session Name
            </Text>
            <Text variant="p7" color="textPrimary" fontWeight="700">
              {values.name || 'My Bot'}
            </Text>
          </Box>
          <Box height={1} backgroundColor="gray800" mb="m" />

          <Box flexDirection="row" justifyContent="space-between" mb="m">
            <Text variant="p7" color="textSecondary">
              Duration
            </Text>
            <Text variant="p7" color="textPrimary" fontWeight="700">
              {values.duration}
            </Text>
          </Box>
          <Box height={1} backgroundColor="gray800" mb="m" />

          <Box flexDirection="row" justifyContent="space-between" mb="m">
            <Text variant="p7" color="textSecondary">
              Spending Limit
            </Text>
            <Text variant="p7" color="textPrimary" fontWeight="700">
              {values.spendingLimit || '0.00'} USDC
            </Text>
          </Box>
          <Box height={1} backgroundColor="gray800" mb="m" />

          <Box flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text variant="p7" color="textSecondary">
              Allowed transactions
            </Text>
            <Box flexDirection="row" flexWrap="wrap" justifyContent="flex-end">
              {values.allowedActions.map((id) => (
                <Box
                  key={id}
                  paddingHorizontal="m"
                  py="xs"
                  borderRadius={8}
                  ml="xs"
                  style={{
                    backgroundColor: 'rgba(255, 184, 0, 0.1)',
                  }}
                >
                  <Text variant="p7" color="primary" fontWeight="700">
                    {ACTION_MAP[id] || id}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Security Warning */}
        <Box
          borderRadius={16}
          padding="m"
          borderWidth={1}
          style={{
            backgroundColor: 'rgba(255, 184, 0, 0.1)',
            borderColor: 'rgba(255, 184, 0, 0.1)',
          }}
        >
          <Text variant="h11" color="inputError" fontWeight="700" mb="s">
            Security Warning
          </Text>
          <Text variant="p6" color="textSecondary" lineHeight={22}>
            This session will be able to perform actions on your behalf without requiring your
            explicit approval each time.
          </Text>
        </Box>
      </ScrollView>

      {/* Footer */}
      <Box position="absolute" bottom={20} left={16} right={16}>
        <TouchableOpacity activeOpacity={0.7} onPress={onSubmit}>
          <Box
            height={64}
            backgroundColor="primary"
            borderRadius={32}
            justifyContent="center"
            alignItems="center"
          >
            <Text variant="h10" color="black" fontWeight="700">
              Confirm & Create Key
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default SessionKeyStep3;
