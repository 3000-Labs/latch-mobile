import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutPromptSheet = ({ visible, onClose, onConfirm }: Props) => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
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
            backgroundColor: theme.colors.bg11,
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateY }],
          },
        ]}
      >
        <Box paddingVertical="m" px={'m'} alignItems="center">
          <Text variant="h7" color="textPrimary" fontWeight="700" mb="m" textAlign="center">
            Log Out!
          </Text>

          <Text variant="p5" color="textSecondary" textAlign="center" mb="xl" lineHeight={24}>
            Are you sure you want to log out{'\n'}from{' '}
            <Text color="textPrimary" fontFamily={'SFproBold'} fontWeight="700">
              Latch
            </Text>
            ?
          </Text>

          <Box flexDirection="row" width="100%" justifyContent="space-between">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              style={{ flex: 1, marginRight: 12 }}
            >
              <Box
                height={48}
                borderRadius={32}
                borderWidth={1}
                borderColor="textSecondary"
                justifyContent="center"
                alignItems="center"
                style={{ opacity: 0.8 }}
              >
                <Text variant="h10" color="textPrimary" fontWeight="700">
                  No, Cancel
                </Text>
              </Box>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={onConfirm} style={{ flex: 1 }}>
              <Box
                height={48}
                backgroundColor="primary"
                borderRadius={32}
                justifyContent="center"
                alignItems="center"
                style={{ backgroundColor: '#FF5722' }} // Specifically using the orange-red from the design
              >
                <Text variant="h10" color="black" fontWeight="700">
                  Yes, Go Ahead
                </Text>
              </Box>
            </TouchableOpacity>
          </Box>
        </Box>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
});

export default LogoutPromptSheet;
