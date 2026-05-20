import { checkBackupExists, uploadBackup } from '@/src/api/latch-auth';
import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Box from '@/src/components/shared/Box';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import { SECURE_KEYS } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import * as SecureStore from 'expo-secure-store';
import { Formik } from 'formik';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Yup from 'yup';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const schema = Yup.object({
  password: Yup.string().min(8, 'Must be at least 8 characters').required('Required'),
  confirm: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Required'),
});

interface Props {
  visible: boolean;
  onClose: () => void;
}

const BackupSheet = ({ visible, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const [backupExists, setBackupExists] = useState<boolean | null>(null);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      checkBackupExists()
        .then(setBackupExists)
        .catch(() => setBackupExists(false));

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

  const handleSubmit = async (
    values: { password: string; confirm: string },
    { setSubmitting, setFieldError, resetForm }: any,
  ) => {
    try {
      await SecureStore.setItemAsync(SECURE_KEYS.RECOVERY_PASSWORD_SESSION, values.password);
      await uploadBackup();
      setBackupExists(true);
      resetForm();
      Toast.show({ type: 'success', text1: 'Backup saved', text2: 'Your wallet is now backed up.' });
      onClose();
    } catch (err: any) {
      await SecureStore.deleteItemAsync(SECURE_KEYS.RECOVERY_PASSWORD_SESSION).catch(() => {});
      setFieldError('password', err?.message ?? 'Backup failed. Please try again.');
    } finally {
      setSubmitting(false);
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
            mb="s"
          >
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text variant="h8" color="textPrimary" fontWeight="700">
              Wallet Backup
            </Text>
            <Box width={40} />
          </Box>

          <Box paddingHorizontal="m">
            {/* Status row */}
            <Box
              backgroundColor="bg11"
              borderRadius={16}
              padding="m"
              flexDirection="row"
              alignItems="center"
              mb="l"
            >
              <Box
                width={36}
                height={36}
                borderRadius={10}
                style={{ backgroundColor: isDark ? '#1E1E1E' : theme.colors.gray200 }}
                justifyContent="center"
                alignItems="center"
                mr="m"
              >
                <Ionicons
                  name={backupExists ? 'cloud-done-outline' : 'cloud-offline-outline'}
                  size={20}
                  color={backupExists ? theme.colors.primary700 : theme.colors.textSecondary}
                />
              </Box>
              <Box flex={1}>
                <Text variant="p7" color="textPrimary" fontWeight="600">
                  {backupExists === null ? 'Checking status…' : backupExists ? 'Backup exists' : 'No backup found'}
                </Text>
                <Text variant="p8" color="textSecondary" mt="xs">
                  {backupExists
                    ? 'Enter your recovery password to update it.'
                    : 'Set a recovery password to back up your wallet.'}
                </Text>
              </Box>
            </Box>

            <Formik
              initialValues={{ password: '', confirm: '' }}
              validationSchema={schema}
              onSubmit={handleSubmit}
            >
              {({ handleChange, handleBlur, handleSubmit: submit, values, errors, touched, isSubmitting }) => (
                <Box>
                  <Input
                    value={values.password}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    placeholder="Recovery password"
                    secureTextEntry
                    showPasswordToggle
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    status={touched.password && errors.password ? 'danger' : 'basic'}
                  />
                  {touched.password && errors.password ? (
                    <Text variant="p8" color="danger900" mt="xs" mb="s" ml="xs">
                      {errors.password}
                    </Text>
                  ) : (
                    <Box mb="s" />
                  )}

                  <Input
                    value={values.confirm}
                    onChangeText={handleChange('confirm')}
                    onBlur={handleBlur('confirm')}
                    placeholder="Confirm password"
                    secureTextEntry
                    showPasswordToggle
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => submit()}
                    status={touched.confirm && errors.confirm ? 'danger' : 'basic'}
                  />
                  {touched.confirm && errors.confirm ? (
                    <Text variant="p8" color="danger900" mt="xs" mb="m" ml="xs">
                      {errors.confirm}
                    </Text>
                  ) : (
                    <Box mb="m" />
                  )}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => submit()}
                    disabled={isSubmitting}
                  >
                    <Box
                      height={64}
                      backgroundColor={isSubmitting ? 'btnDisabled' : 'primary700'}
                      borderRadius={32}
                      justifyContent="center"
                      alignItems="center"
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color={theme.colors.gray600} />
                      ) : (
                        <Text variant="h10" color={isSubmitting ? 'gray600' : 'black'} fontWeight="700">
                          {backupExists ? 'Update Backup' : 'Back Up Now'}
                        </Text>
                      )}
                    </Box>
                  </TouchableOpacity>
                </Box>
              )}
            </Formik>
          </Box>
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
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
});

export default BackupSheet;
