import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export type FundingStepStatus = 'success' | 'error' | 'inactive';

interface FundingStep {
  label: string;
  sublabel?: string;
  status: FundingStepStatus;
  time?: string;
}

interface FundingStatusSheetProps {
  visible: boolean;
  onClose: () => void;
  amount?: string;
  statusLabel?: string;
  steps?: FundingStep[];
  txHash?: string;
}

const FundingStatusSheet: React.FC<FundingStatusSheetProps> = ({
  visible,
  onClose,
  amount = '+$505.00',
  statusLabel = 'Pending',
  steps = [
    { label: 'Deposit\ninitiated', time: '05-07 13:38:58', status: 'success' },
    { label: 'Deposit\nDetected', sublabel: '05-07 13:38:58', status: 'success' },
    { label: 'Forwarding to\nSmart Account', sublabel: '05-07 13:38:58', status: 'error' },
    { label: 'Deposit\nCompleted', time: '05-07 13:38:58', status: 'inactive' },
  ],
  txHash = '7a8f9e2c3d4b5a6c7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
}) => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 150,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const getStepIcon = (status: FundingStepStatus) => {
    switch (status) {
      case 'success':
        return require('@/src/assets/icon/star.png');
      case 'error':
        return require('@/src/assets/icon/star-error.png');
      case 'inactive':
      default:
        return require('@/src/assets/icon/star-inactive.png');
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Box flex={1} justifyContent="flex-end">
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.9)',
              },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            {
              flex: 1,
              backgroundColor: theme.colors.bg11,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              transform: [{ translateY }],
              marginTop: insets.top,
            },
          ]}
        >
          {/* Header */}
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal="m"
            height={60}
          >
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>

            <Text variant="p7" color="textPrimary" fontWeight="700">
              Funding Status
            </Text>

            <Box width={20} />
          </Box>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* Asset and Amount */}
            <Box alignItems="center" mb="xl">
              <Box backgroundColor="bg11" padding="m" borderRadius={12} overflow="hidden">
                <Image
                  source={require('@/src/assets/token/stellar.png')}
                  style={{ width: 80, height: 80 }}
                  resizeMode="contain"
                />
              </Box>

              <Text variant="h7" color="textPrimary" fontWeight="700" mb="s">
                {amount}
              </Text>

              <Box
                backgroundColor={
                  statusLabel === 'Completed' || statusLabel === 'Success'
                    ? 'success50'
                    : statusLabel === 'Failed' || statusLabel === 'Error'
                    ? 'danger50'
                    : 'labelBg'
                }
                paddingHorizontal="m"
                paddingVertical="xs"
                borderRadius={12}
              >
                <Text
                  variant="p7"
                  color={
                    statusLabel === 'Completed' || statusLabel === 'Success'
                      ? 'success700'
                      : statusLabel === 'Failed' || statusLabel === 'Error'
                      ? 'inputError'
                      : 'primary'
                  }
                  fontWeight="700"
                >
                  {statusLabel}
                </Text>
              </Box>
            </Box>

            {/* Stepper */}
            <Box paddingHorizontal="m" mb="xl">
              <Box flexDirection="row" alignItems="center" justifyContent="space-between" px="s">
                {steps.map((step, index) => (
                  <React.Fragment key={index}>
                    <Box alignItems="center" flex={1}>
                      <Image
                        source={getStepIcon(step.status)}
                        style={{ width: 32, height: 32 }}
                        resizeMode="contain"
                      />
                    </Box>
                    {index < steps.length - 1 && (
                      <Box
                        height={4}
                        backgroundColor={
                          steps[index + 1].status === 'success'
                            ? 'mainColorHover'
                            : steps[index + 1].status === 'error'
                              ? 'inputError'
                              : 'gray800'
                        }
                        flex={1}
                        style={{ zIndex: -1, marginHorizontal: -24 }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </Box>

              <Box flexDirection="row" justifyContent="space-between" mt="m">
                {steps.map((step, index) => (
                  <Box key={index} width={(SCREEN_WIDTH - 40) / 4} alignItems="center">
                    <Text
                      variant="h12"
                      color={
                        step.status === 'success'
                          ? 'textPrimary'
                          : step.status === 'error'
                            ? 'inputError'
                            : 'textSecondary'
                      }
                      textAlign="center"
                      fontWeight="700"
                    >
                      {step.label}
                    </Text>
                    {(step.time || step.sublabel) && (
                      <Text variant="p8" color="textTertiary" textAlign="center" mt="xs">
                        {step.time || step.sublabel}
                      </Text>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Transaction Hash */}
            <Box paddingHorizontal="m" mb="xl">
              <Text variant="p6" color="textPrimary" fontWeight="700" mb="m">
                Transaction Hash
              </Text>
              <Box backgroundColor="gray900" padding="m" borderRadius={16}>
                <Text variant="p7" color="textSecondary" lineHeight={22}>
                  {txHash}
                </Text>
              </Box>
            </Box>

            {/* Footer Buttons */}
            <Box paddingHorizontal="m" gap="m">
              <TouchableOpacity activeOpacity={0.8} onPress={onClose}>
                <Box
                  height={56}
                  backgroundColor="primary"
                  borderRadius={28}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text variant="p6" color="bg11" fontWeight="700">
                    Back To Home
                  </Text>
                </Box>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8}>
                <Box
                  height={56}
                  backgroundColor="transparent"
                  borderRadius={28}
                  borderWidth={1}
                  borderColor="gray800"
                  flexDirection="row"
                  justifyContent="center"
                  alignItems="center"
                  gap="s"
                >
                  <Text variant="p6" color="textPrimary" fontWeight="700">
                    View On Stellar Explorer
                  </Text>
                  <Ionicons name="open-outline" size={16} color={theme.colors.textPrimary} />
                </Box>
              </TouchableOpacity>
            </Box>
          </ScrollView>
        </Animated.View>
      </Box>
    </Modal>
  );
};

export default FundingStatusSheet;
