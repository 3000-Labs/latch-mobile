import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import React from 'react';
import { Image, TouchableOpacity } from 'react-native';

interface ProfileImageSectionProps {
  imageSource: any;
  onChangePress: () => void;
}

const ProfileImageSection = ({ imageSource, onChangePress }: ProfileImageSectionProps) => {
  return (
    <Box
      backgroundColor="bg11"
      borderRadius={24}
      paddingVertical="m"
      alignItems="center"
      justifyContent="center"
      mb="l"
    >
      <Box
        width={40}
        height={40}
        borderRadius={20}
        overflow="hidden"
        mb="s"
        borderWidth={2}
        borderColor="bg900"
      >
        <Image source={imageSource} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </Box>
      <TouchableOpacity onPress={onChangePress}>
        <Text variant="h11" color="primary700" fontWeight="700">
          Change Profile Picture
        </Text>
      </TouchableOpacity>
    </Box>
  );
};

export default ProfileImageSection;
