import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface MascotSectionProps {
  success: boolean;
}

const MascotSection: React.FC<MascotSectionProps> = ({ success }) => {
  return (
    <View style={styles.container}>
      <Image
        source={
          success
            ? require('@/src/assets/images/success.png')
            : require('@/src/assets/images/error.png')
        }
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  image: {
    width: 240,
    height: 240,
  },
});

export default MascotSection;
