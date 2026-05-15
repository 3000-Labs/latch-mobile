import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import PermissionItem from './PermissionItem';
import PermissionsInfoModal from './PermissionsInfoModal';
import SessionKeyForm from './SessionKeyForm';
import StepIndicator from './StepIndicator';

interface Permission {
  id: string;
  name: string;
  duration: string;
  spendingLimit: string;
  allowedActions: string[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PermissionsSheet = ({ visible, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  const [isCreating, setIsCreating] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showInfo, setShowInfo] = useState(false);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setIsCreating(false);
      setFormStep(1);
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
  }, [visible, translateY]);

  const handleBack = () => {
    if (isCreating) {
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
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
                {isCreating
                  ? formStep === 1
                    ? 'Create Session Key'
                    : formStep === 2
                      ? 'Set Limits'
                      : 'Review & Confirm'
                  : 'Permissions'}
              </Text>

              {isCreating ? (
                <StepIndicator currentStep={formStep} totalSteps={3} />
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

          {isCreating ? (
            <SessionKeyForm
              currentStep={formStep}
              setStep={setFormStep}
              onBack={handleBack}
              onComplete={(values) => {
                const newPermission: Permission = {
                  id: Math.random().toString(),
                  name: values.name,
                  duration: values.duration,
                  spendingLimit: values.spendingLimit || '0.00',
                  allowedActions: values.allowedActions,
                };
                setPermissions([newPermission, ...permissions]);
                setIsCreating(false);
              }}
            />
          ) : permissions.length > 0 ? (
            /* Active State */
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
              {/* Info Card */}
              <Box backgroundColor="bg11" borderRadius={16} padding="m" mb="m">
                <Text variant="h10" color="textPrimary" fontWeight="700" mb="s">
                  Session Keys & dApps
                </Text>
                <Text variant="p6" color="textSecondary" mb="m" lineHeight={22}>
                  Active sessions with temporary permissions. Revoking a session immediately removes
                  its access.
                </Text>
                <TouchableOpacity onPress={() => setShowInfo(true)}>
                  <Text variant="p6" color="primary" fontWeight="700">
                    Learn how permissions work
                  </Text>
                </TouchableOpacity>
              </Box>

              {permissions.map((p) => (
                <PermissionItem key={p.id} permission={p} />
              ))}
            </ScrollView>
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
      </KeyboardAvoidingView>
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
