import { useTheme } from '@shopify/restyle';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Dimensions, Image } from 'react-native';

import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const { width } = Dimensions.get('window');

const ThankYou = () => {
  const theme = useTheme<Theme>();
  const router = useRouter();

  return (
    <Box flex={1} backgroundColor="mainBackground" padding="xl">
      <StatusBar style="light" />
      
      <Box flex={1} justifyContent="center" alignItems="center">
        <Image
          source={require('@/src/assets/images/success.png')}
          style={{ width: width * 0.6, height: width * 0.6 }}
          resizeMode="contain"
        />
        
        <Box alignItems="center" mt="xxl">
          <Text variant="h7" fontSize={32} textAlign="center">
           Thank You
          </Text>
          <Text variant="p5" color="textSecondary" mt="m" textAlign="center" style={{marginHorizontal: "auto", width: width*0.8}}>
           Your email has been confirmed. Please proceed to sign in to your account.
          </Text>
        </Box>
      </Box>

      <Box pb="xl">
        <Button
          label="Go to Home"
          variant="primary"
          onPress={() => router.replace('/(tabs)/home')}
          bg="primary700"
          labelColor="black"
        />
      </Box>
    </Box>
  );
};

export default ThankYou;
