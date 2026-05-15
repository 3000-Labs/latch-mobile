import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Yup from 'yup';
import { useTheme } from '@shopify/restyle';
import { Formik } from 'formik';
import { Ionicons } from '@expo/vector-icons';

import ProfileImageSection from '@/src/components/profile/ProfileImageSection';
import Box from '@/src/components/shared/Box';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

const AccountInfoSchema = Yup.object().shape({
  walletName: Yup.string().required('Wallet name is required'),
});

const AccountInfoSheet = ({ visible, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const { accounts, activeAccountIndex, renameAccount, setAccountImage } = useWalletStore();
  const activeAccount = accounts[activeAccountIndex];

  const [selectedImage, setSelectedImage] = useState<string | null>(activeAccount?.image || null);

  // Slide-up animation
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setSelectedImage(activeAccount?.image || null);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, translateY]);

  const initialValues = {
    walletName: activeAccount?.name || '',
    address: activeAccount?.smartAccountAddress || activeAccount?.gAddress || '',
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSave = async (values: any) => {
    try {
      await renameAccount(activeAccountIndex, values.walletName);
      await setAccountImage(activeAccountIndex, selectedImage);
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Account information updated',
      });
      
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update account information',
      });
    }
  };

  if (!activeAccount && visible) return null;

  const isModified = activeAccount && (initialValues.walletName !== initialValues.walletName || selectedImage !== activeAccount.image);

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
            },
          ]}
        >
          <BottomSheetHandle />

          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            paddingHorizontal="m"
            py="m"
          >
            <Text variant="h9" color="textPrimary" fontWeight="700">
              Account Information
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </Box>

          <Formik
            initialValues={initialValues}
            validationSchema={AccountInfoSchema}
            onSubmit={handleSave}
            enableReinitialize
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, dirty }) => {
              const canSave = dirty || selectedImage !== activeAccount?.image;
              
              return (
                <View style={{ flexShrink: 1, minHeight: 400 }}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                    bounces={false}
                  >
                    <ProfileImageSection
                      imageSource={selectedImage ? { uri: selectedImage } : require('@/src/assets/token/user.png')}
                      onChangePress={handleImagePick}
                    />

                    <Box mb="l">
                      <Text variant="h10" color="textPrimary" mb="s" fontWeight="700">
                        Wallet Name
                      </Text>
                      <Input
                        value={values.walletName}
                        onChangeText={handleChange('walletName')}
                        onBlur={handleBlur('walletName')}
                        status={touched.walletName && errors.walletName ? 'danger' : 'basic'}
                      />
                      {touched.walletName && errors.walletName && (
                        <Text variant="h12" color="inputError" mt="xs">
                          {errors.walletName}
                        </Text>
                      )}
                    </Box>

                    <Box mb="l">
                      <Text variant="h10" color="textPrimary" mb="s" fontWeight="700">
                        Smart Account Address
                      </Text>
                      <Box
                        backgroundColor="bg11"
                        borderRadius={14}
                        padding="m"
                        borderWidth={1}
                        borderColor="gray800"
                        minHeight={60}
                      >
                        <Text variant="h11" color="textPrimary" lineHeight={22}>
                          {values.address}
                        </Text>
                      </Box>
                    </Box>
                  </ScrollView>

                  <Box padding="m">
                    <TouchableOpacity 
                      activeOpacity={0.7} 
                      onPress={() => handleSubmit()}
                      disabled={!canSave}
                    >
                      <Box
                        height={64}
                        backgroundColor={canSave ? 'primary700' : 'bg11'}
                        borderRadius={32}
                        justifyContent="center"
                        alignItems="center"
                        style={{ opacity: canSave ? 1 : 0.6 }}
                      >
                        <Text 
                          variant="h10" 
                          color={canSave ? 'black' : 'textSecondary'} 
                          fontWeight="700"
                        >
                          Save Changes
                        </Text>
                      </Box>
                    </TouchableOpacity>
                  </Box>
                </View>
              );
            }}
          </Formik>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    width: '100%',
  },
});

export default AccountInfoSheet;
