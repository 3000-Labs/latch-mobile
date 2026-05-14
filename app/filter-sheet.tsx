import React, { useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import UtilityHeader from '@/src/components/shared/UtilityHeader';
import FilterChip from '@/src/components/shared/FilterChip';
import DatePickerField from '@/src/components/shared/DatePickerField';

import { 
  startOfWeek, 
  endOfWeek, 
  subWeeks, 
  startOfMonth, 
  startOfYear, 
  subMonths, 
  subYears 
} from 'date-fns';

const PERIODS = ['Custom Period', 'Current Week', 'Last Week', 'Monthly', 'Yearly'];

const FilterSheet = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState('Custom Period');
  const [startDate, setStartDate] = useState(new Date(2026, 4, 4));
  const [endDate, setEndDate] = useState(new Date(2026, 4, 8));

  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();

    switch (period) {
      case 'Current Week':
        setStartDate(startOfWeek(now));
        setEndDate(now);
        break;
      case 'Last Week':
        const lastWeek = subWeeks(now, 1);
        setStartDate(startOfWeek(lastWeek));
        setEndDate(endOfWeek(lastWeek));
        break;
      case 'Monthly':
        setStartDate(startOfMonth(now));
        setEndDate(now);
        break;
      case 'Yearly':
        setStartDate(startOfYear(now));
        setEndDate(now);
        break;
      default:
        // Keep current dates for "Custom Period"
        break;
    }
  };

  const handleClearAll = () => {
    setSelectedPeriod('Custom Period');
    setStartDate(new Date(2026, 4, 4));
    setEndDate(new Date(2026, 4, 8));
  };

  const handleApply = () => {
    // Logic to apply filter
    router.back();
  };

  return (
    <Box flex={1} backgroundColor="mainBackground" style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}>
      <UtilityHeader title="" onBack={() => router.back()} showHandle={true} />
      
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        <Text variant="p7" color="gray600" mb="m">
          Period
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }}>
          {PERIODS.map((period) => (
            <FilterChip
              key={period}
              label={period}
              selected={selectedPeriod === period}
              onPress={() => handlePeriodSelect(period)}
            />
          ))}
        </ScrollView>

        <DatePickerField 
          label="Start Date" 
          date={startDate} 
          onChange={setStartDate} 
        />
        
        <DatePickerField 
          label="End Date" 
          date={endDate} 
          onChange={setEndDate} 
        />
      </ScrollView>

      {/* Bottom Buttons */}
      <Box 
        position="absolute" 
        bottom={0} 
        left={0} 
        right={0} 
        flexDirection="row" 
        gap="m" 
        padding="m"
        backgroundColor="mainBackground"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={0.7} 
          onPress={handleClearAll}
        >
          <Box
            height={64}
            backgroundColor="bg11"
            borderRadius={32}
            justifyContent="center"
            alignItems="center"
          >
            <Text variant="h10" color="textPrimary" fontWeight="700">
              Clear All
            </Text>
          </Box>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={0.7} 
          onPress={handleApply}
        >
          <Box
            height={64}
            backgroundColor="primary"
            borderRadius={32}
            justifyContent="center"
            alignItems="center"
          >
            <Text variant="h10" color="black" fontWeight="700">
              Apply
            </Text>
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default FilterSheet;
