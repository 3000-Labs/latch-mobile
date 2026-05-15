import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NetworkItem from '@/src/components/network/NetworkItem';
import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const NETWORKS = [
  { id: 'public', name: 'Public Network', description: 'Standard production environment' },
  { id: 'testnet', name: 'Testnet', description: 'Environment for testing' },
  { id: 'futurenet', name: 'Futurenet', description: 'Environment for early features' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

const NetworkSheet = ({ visible, onClose }: Props) => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const [selectedNetwork, setSelectedNetwork] = useState('public');

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? theme.colors.cardbg : theme.colors.mainBackground,
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateY }],
            maxHeight: SCREEN_HEIGHT * 0.9,
            minHeight: SCREEN_HEIGHT * 0.9,
          },
        ]}
      >
        <BottomSheetHandle />

        {/* Header */}
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="m"
          py="m"
          mb="m"
        >
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <Text variant="h10" color="textPrimary" fontWeight="700">
            Network
          </Text>

          <Box width={40} />
        </Box>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}>
          {NETWORKS.map((network) => (
            <TouchableOpacity
              key={network.id}
              activeOpacity={0.7}
              onPress={() => setSelectedNetwork(network.id)}
            >
              <NetworkItem
                name={network.name}
                description={network.description}
                isSelected={selectedNetwork === network.id}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
});

export default NetworkSheet;
