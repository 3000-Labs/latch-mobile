import Box from '@/src/components/shared/Box';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, TouchableOpacity } from 'react-native';

interface HeaderProps {
  onBackPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBackPress }) => {
  const router = useRouter();
  const theme = useTheme<Theme>();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      // pb={'xs'}
    >
      <TouchableOpacity
        onPress={handleBack}
        activeOpacity={0.7}
        style={{
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>

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
