import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { SHEET_HEIGHT } from '@/src/constants/constants';
import { SessionKey, usePermissions } from '@/src/store/permissions';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import PermissionsInfoModal from './PermissionsInfoModal';
import SessionKeyForm from './SessionKeyForm';
import StepIndicator from './StepIndicator';
import SwipeablePermissionItem from './SwipeablePermissionItem';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PermissionsSheet = ({ visible, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  const { accounts, activeAccountIndex } = useWalletStore();
  const accountAddress = accounts[activeAccountIndex]?.smartAccountAddress ?? '';
  const { byAccount, rehydrate, addSessionKey, revokeSessionKey } = usePermissions();
  const sessionKeys = (byAccount[accountAddress]?.sessionKeys ?? []).filter(
    (k) => k.status === 'active',
  );

  const [isCreating, setIsCreating] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<SessionKey | null>(null);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setIsCreating(false);
      setFormStep(1);
      setRevokeTarget(null);
      rehydrate();
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        mass: 1,
        stiffness: 150,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY, rehydrate]);

  const handleBack = () => {
    if (revokeTarget) {
      setRevokeTarget(null);
    } else if (isCreating) {
      if (formStep > 1) {
        setFormStep(formStep - 1);
      } else {
        setIsCreating(false);
      }
    } else {
      onClose();
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? theme.colors.cardbg : theme.colors.mainBackground,
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY }],
              height: SHEET_HEIGHT,
            },
          ]}
        >
          <BottomSheetHandle />

          {/* Header */}
          {isCreating && formStep === 4 ? null : (
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal="m"
              py="m"
              mb="m"
            >
              <TouchableOpacity
                onPress={handleBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>

              <Text variant="h10" color="textPrimary" fontWeight="700">
                {revokeTarget
                  ? 'Revoke Session'
                  : isCreating
                    ? formStep === 1
                      ? 'Create Session Key'
                      : formStep === 2
                        ? 'Set Limits'
                        : 'Review & Confirm'
                    : 'Permissions'}
              </Text>

              {isCreating ? (
                <StepIndicator currentStep={formStep} totalSteps={3} />
              ) : revokeTarget ? (
                <Box width={24} />
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setFormStep(1);
                    setIsCreating(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              )}
            </Box>
          )}

          {revokeTarget ? (
            <Box flex={1} alignItems="center" justifyContent="center" paddingHorizontal="l">
              <Text variant="h7" color="textPrimary" fontWeight="700" mb="xs" textAlign="center">
                Revoke Session Key
              </Text>
              <Text variant="p5" color="textSecondary" textAlign="center" lineHeight={24} mb="xl">
                Revoking{' '}
                <Text variant="p5" color="textPrimary" fontWeight="700">
                  {revokeTarget.name}
                </Text>{' '}
                immediately removes its access. This can&apos;t be undone.
              </Text>

              <Box flexDirection="row" width="100%" justifyContent="space-between">
                <TouchableOpacity
                  onPress={() => setRevokeTarget(null)}
                  activeOpacity={0.7}
                  style={{ flex: 1, marginRight: 8 }}
                >
                  <Box
                    height={56}
                    borderRadius={28}
                    borderWidth={1}
                    borderColor="gray800"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text variant="h11" color="textPrimary" fontWeight="700">
                      Cancel
                    </Text>
                  </Box>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    revokeSessionKey(accountAddress, revokeTarget.id);
                    setRevokeTarget(null);
                  }}
                  activeOpacity={0.7}
                  style={{ flex: 1, marginLeft: 8 }}
                >
                  <Box
                    height={56}
                    borderRadius={28}
                    justifyContent="center"
                    alignItems="center"
                    style={{ backgroundColor: '#E23A10' }}
                  >
                    <Text variant="h11" color="black" fontWeight="700">
                      Revoke
                    </Text>
                  </Box>
                </TouchableOpacity>
              </Box>
            </Box>
          ) : isCreating ? (
            <SessionKeyForm
              currentStep={formStep}
              setStep={setFormStep}
              onBack={handleBack}
              onComplete={(values) => {
                addSessionKey(accountAddress, {
                  name: values.name,
                  durationLabel: values.duration,
                  spendingLimit: values.spendingLimit,
                  allowedActions: values.allowedActions,
                });
                setIsCreating(false);
              }}
            />
          ) : sessionKeys.length > 0 ? (
            /* Active State */
            <KeyboardAwareScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} bottomOffset={16}>
              {/* Info Card */}
              <Box backgroundColor="bg11" borderRadius={16} padding="m" mb="m">
                <Text variant="h10" color="textPrimary" fontWeight="700" mb="s">
                  Session Keys & dApps
                </Text>
                <Text variant="p6" color="textSecondary" mb="m" lineHeight={22}>
                  Active sessions with temporary permissions. Swipe a session left to revoke it —
                  revoking immediately removes its access.
                </Text>
                <TouchableOpacity onPress={() => setShowInfo(true)}>
                  <Text variant="p6" color="primary" fontWeight="700">
                    Learn how permissions work
                  </Text>
                </TouchableOpacity>
              </Box>

              {sessionKeys.map((p) => (
                <SwipeablePermissionItem
                  key={p.id}
                  permission={p}
                  onRevoke={() => setRevokeTarget(p)}
                />
              ))}
            </KeyboardAwareScrollView>
          ) : (
            /* Content (Empty State) */
            <Box flex={1} alignItems="center" justifyContent="center" paddingHorizontal="xl">
              <Box mb="xl">
                <Image
                  source={require('@/src/assets/images/empty.png')}
                  style={{ width: 220, height: 220 }}
                  resizeMode="contain"
                />
              </Box>

              <Text variant="h7" color="textPrimary" textAlign={'center'} fontWeight="700" mb="xs">
                No Permissions Yet!
              </Text>

              <Text variant="p5" color="textSecondary" textAlign="center" lineHeight={24}>
                Tap the &quot;Add Icon&quot; to get started
              </Text>
            </Box>
          )}
          <PermissionsInfoModal visible={showInfo} onClose={() => setShowInfo(false)} />
        </Animated.View>
      </View>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
});

export default PermissionsSheet;
