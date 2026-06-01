import Box from '@/src/components/shared/Box';
import { Theme } from '@/src/theme/theme';
import { useTheme } from '@shopify/restyle';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Header: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      paddingHorizontal="m"
      style={{
        paddingTop: Math.max(insets.top, 20),
        height: Math.max(insets.top, 20) + 50,
      }}
    >
      {/* <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' }}
      >
        <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity> */}
      <Box width={40} />

      <Image
        source={require('@/src/assets/images/logoLoading.png')}
        style={{ width: 35, height: 35 }}
        resizeMode="contain"
      />

      <Box width={40} />
    </Box>
  );
};

export default Header;
