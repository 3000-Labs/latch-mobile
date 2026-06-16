import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
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
import { Theme } from '@/src/theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const RemoveMemberSheet: React.FC<Props> = ({ visible, onCancel, onConfirm }) => {
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
  }, [visible, translateY]);

  const dismiss = (cb: () => void) => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => cb());
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={() => dismiss(onCancel)}>
      <TouchableWithoutFeedback onPress={() => dismiss(onCancel)}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.cardbg,
            paddingBottom: Math.max(insets.bottom, 20),
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle */}
        <Box alignItems="center" pt="m" pb="s">
          <Box width={36} height={4} borderRadius={2} backgroundColor="gray800" />
        </Box>

        {/* Title */}
        <Box px="m" pt="m" pb="s" alignItems="center">
          <Text variant="h8" color="textPrimary" fontWeight="700" textAlign="center">
            Remove Member
          </Text>
        </Box>

        {/* Subtitle with bold "Latch" */}
        <Box px="xl" pb="xl" alignItems="center">
          <Text variant="p6" color="textSecondary" textAlign="center">
            Are you sure you want to remove this member from{' '}
            <Text variant="p6" color="textPrimary" fontWeight="700">
              Latch
            </Text>
            ?
          </Text>
        </Box>

        {/* Buttons */}
        <Box flexDirection="row" gap="m" px="m">
          {/* No, Cancel */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.bg11, flex: 1 }]}
            activeOpacity={0.8}
            onPress={() => dismiss(onCancel)}
          >
            <Text variant="h10" color="textPrimary" fontWeight="700">
              No, Cancel
            </Text>
          </TouchableOpacity>

          {/* Yes, Go Ahead */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.danger900, flex: 1 }]}
            activeOpacity={0.8}
            onPress={() => dismiss(onConfirm)}
          >
            <Text variant="h10" color="white" fontWeight="700">
              Yes, Go Ahead
            </Text>
          </TouchableOpacity>
        </Box>
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
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  btn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RemoveMemberSheet;
