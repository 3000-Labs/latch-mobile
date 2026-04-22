import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import ProgressPagination from '@/src/components/shared/ProgressPagination';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useTheme } from '@shopify/restyle';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');
// const ONBOARDING_KEY = 'latch_onboarding_complete';

const ONBOARDING_DATA = [
  {
    id: 1,
    title: 'Welcome to Latch',
    description:
      'Your secure gateway to the Stellar ecosystem. Manage your digital assets with confidence and simplicity.',
    image: require('@/src/assets/images/ob1.png'),
  },
  {
    id: 2,
    title: 'Smart Accounts',
    description:
      'Experience enhanced security with Smart Accounts. Advanced features abstracted into a simple, user-friendly interface.',
    image: require('@/src/assets/images/ob3.png'),
  },
  {
    id: 3,
    title: 'Seamless Funding',
    description:
      'Fund your Smart Account easily using traditional Stellar G-addresses with memos. We handle the complexity for you.',
    image: require('@/src/assets/images/on2.png'),
  },
];

const Onboarding = () => {
  const statusBarStyle = useStatusBarStyle();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const theme = useTheme<Theme>();

  // const completeOnboarding = async () => {
  //   try {
  //     await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  //     router.replace('/(tabs)/home');
  //   } catch (e) {
  //     router.replace('/(tabs)/home');
  //   }
  // };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <Box flex={1} backgroundColor="onboardingbg">
      <StatusBar style={statusBarStyle} />
      {/* Header */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="xl"
        paddingTop="xl"
        mt={'xxl'}
        style={{ zIndex: 10 }}
      >
        <Box />
        {/* <TouchableOpacity onPress={completeOnboarding}>
                    <Box flexDirection="row" alignItems="center">
                        <Text variant="body" color="textSecondary" marginRight="xs">Skip</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </Box>
                </TouchableOpacity> */}
      </Box>

      {/* Content */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Box width={width} alignItems="center" paddingTop="xl">
            <Image
              source={item.image}
              style={{ width: width, height: width }}
              resizeMode="contain"
            />

            <Box paddingHorizontal="l" marginTop="xl" alignItems="center">
              <Text variant="h7" textAlign="center" marginBottom="s">
                {item.title}
              </Text>
              <Text variant="p5" textAlign="center" color="textSecondary">
                {item.description}
              </Text>
            </Box>
          </Box>
        )}
      />

      {/* Footer */}
      <Box paddingHorizontal="xl" paddingBottom="xl" alignItems="center" gap="m">
        <ProgressPagination total={3} activeIndex={activeIndex} />

        <Box width="100%" gap="s">
          <Button
            label="Create a New Wallet"
            variant="primary"
            onPress={() => router.navigate('/(auth)/biometric')}
          />
          <Button
            label="I Have a Wallet"
            variant="outline"
            onPress={() => router.navigate('/(onboarding)/get-started')}
            labelColor={statusBarStyle === 'light' ? 'textWhite' : 'black'}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Onboarding;

const styles = StyleSheet.create({});
