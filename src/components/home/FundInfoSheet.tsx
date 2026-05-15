import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FundInfoSheetProps {
  visible: boolean;
  onClose: () => void;
}

const FundInfoSheet: React.FC<FundInfoSheetProps> = ({ visible, onClose }) => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const steps = [
    'Send XLM from any Stellar wallet to the proxy G-address below',
    'Include the memo exactly as shown',
    'Your funds will be forwarded to your Smart Account automatically',
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Box flex={1} justifyContent="flex-end">
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.9)',
                opacity: opacityAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Box
            backgroundColor="gray900"
            borderTopLeftRadius={32}
            borderTopRightRadius={32}
            padding="xl"
            style={{ width: '100%', paddingBottom: insets.bottom + 20 }}
          >
            {/* Header */}
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="m">
              <Text variant="h7" color="textPrimary" fontWeight="700">
                How it works
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </Box>

            {/* Steps */}
            <Box gap="m">
              {steps.map((step, index) => (
                <Box key={index} flexDirection="row" gap="s">
                  <Text variant="p6" color="textPrimary" fontFamily={'SFProBold'}>
                    {index + 1}
                  </Text>
                  <Text variant="p6" color="textTertiary" flex={1}>
                    {step}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        </Animated.View>
      </Box>
    </Modal>
  );
};

export default FundInfoSheet;
