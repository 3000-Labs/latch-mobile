import Text from '@/src/components/shared/Text';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface AddressActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

const AddressActionButton: React.FC<AddressActionButtonProps> = ({ icon, label, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={22} color="#FFAD00" />
      </View>
      <Text variant="p8" color="textSecondary" style={styles.label}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: '100%',
    backgroundColor: '#EEEEEE',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
  },
});

export default AddressActionButton;
