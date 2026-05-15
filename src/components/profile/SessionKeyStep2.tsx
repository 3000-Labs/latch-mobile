import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

import Box from '@/src/components/shared/Box';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  values: {
    duration: string;
    spendingLimit: string;
    allowedActions: string[];
  };
  setFieldValue: (field: string, value: any) => void;
  onNext: () => void;
}

const DURATIONS = ['1 Hour', '1 Day', '1 Week', '1 Month'];
const ACTIONS = [
  { id: 'transfer', title: 'Transfer Tokens', description: 'Allow sending funds within limit' },
  { id: 'swap', title: 'Swap Tokens', description: 'Allow trading tokens on DEX' },
  { id: 'offers', title: 'Manage Offers', description: 'Create or cancel trade offers' },
];

const SessionKeyStep2 = ({ values, setFieldValue, onNext }: Props) => {
  const { isDark } = useAppTheme();

  const toggleAction = (id: string) => {
    const current = [...values.allowedActions];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setFieldValue('allowedActions', current);
  };

  return (
    <Box flex={1}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        {/* Duration Section */}
        <Text variant="h11" color="textPrimary" fontWeight="700" mb="s" mt="m">
          Duration
        </Text>
        <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between">
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d}
              activeOpacity={0.7}
              onPress={() => setFieldValue('duration', d)}
              style={{ width: '48%', marginBottom: 12 }}
            >
              <Box
                height={56}
                backgroundColor="bg11"
                borderRadius={12}
                justifyContent="center"
                alignItems="center"
                borderWidth={1}
                borderColor={values.duration === d ? 'primary' : 'transparent'}
              >
                <Text
                  variant="p7"
                  color={values.duration === d ? 'textPrimary' : 'textSecondary'}
                  fontWeight="600"
                >
                  {d}
                </Text>
              </Box>
            </TouchableOpacity>
          ))}
        </Box>

        {/* Total Spending Limit Section */}
        <Text variant="h11" color="textPrimary" fontWeight="700" mb="s" mt="m">
          Total Spending Limit
        </Text>
        <Box mb="l">
          <Input
            placeholder="0.00"
            value={values.spendingLimit}
            onChangeText={(text: string) => setFieldValue('spendingLimit', text)}
            keyboardType="decimal-pad"
            rightElement={
              <Box
                backgroundColor={isDark ? 'gray800' : 'cardbg'}
                paddingHorizontal="m"
                py="s"
                borderRadius={12}
              >
                <Text variant="p6" color="textPrimary" fontWeight="700">
                  USDC
                </Text>
              </Box>
            }
          />
        </Box>

        {/* Allowed Actions Section */}
        <Text variant="h11" color="textPrimary" fontWeight="700" mb="s">
          Allowed Actions
        </Text>
        {ACTIONS.map((action) => {
          const isSelected = values.allowedActions.includes(action.id);
          return (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.7}
              onPress={() => toggleAction(action.id)}
              style={{ marginBottom: 12 }}
            >
              <Box
                backgroundColor="bg11"
                borderRadius={16}
                padding="m"
                flexDirection="row"
                alignItems="center"
              >
                {isSelected ? (
                  <Box
                    width={24}
                    height={24}
                    borderRadius={12}
                    backgroundColor="primary"
                    justifyContent="center"
                    alignItems="center"
                    mr="m"
                  >
                    <Ionicons name="checkmark" size={16} color="black" />
                  </Box>
                ) : (
                  <Box
                    width={24}
                    height={24}
                    borderRadius={12}
                    borderWidth={1}
                    borderColor="gray800"
                    mr="m"
                  />
                )}
                <Box flex={1}>
                  <Text variant="h11" color="textPrimary" fontWeight="700" mb="xs">
                    {action.title}
                  </Text>
                  <Text variant="p7" color="textSecondary">
                    {action.description}
                  </Text>
                </Box>
              </Box>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <Box position="absolute" bottom={20} left={16} right={16}>
        <TouchableOpacity activeOpacity={0.7} onPress={onNext}>
          <Box
            height={64}
            backgroundColor="primary"
            borderRadius={32}
            justifyContent="center"
            alignItems="center"
          >
            <Text variant="h10" color="black" fontWeight="700">
              Continue
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default SessionKeyStep2;
