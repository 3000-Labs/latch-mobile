import { useTheme } from '@shopify/restyle';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Yup from 'yup';

import ProfileImageSection from '@/src/components/profile/ProfileImageSection';
import Box from '@/src/components/shared/Box';
import Input from '@/src/components/shared/Input';
import Text from '@/src/components/shared/Text';
import UtilityHeader from '@/src/components/shared/UtilityHeader';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';

const AccountInfoSchema = Yup.object().shape({
  walletName: Yup.string().required('Wallet name is required'),
});

const AccountInfo = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();
  const { accounts, activeAccountIndex, renameAccount, setAccountImage } = useWalletStore();
  const activeAccount = accounts[activeAccountIndex];

  const [selectedImage, setSelectedImage] = useState<string | null>(activeAccount?.image || null);

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

      router.back();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update account information',
      });
    }
  };

  return (
    <Box flex={1} backgroundColor="cardbg" style={{ paddingTop: insets.top }}>
      <UtilityHeader title="Account Information" onBack={() => router.back()} />

      <Formik
        initialValues={initialValues}
        validationSchema={AccountInfoSchema}
        onSubmit={handleSave}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, dirty }) => (
          <Box flex={1}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
            >
              <ProfileImageSection
                imageSource={
                  selectedImage ? { uri: selectedImage } : require('@/src/assets/token/user.png')
                }
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

            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              padding="m"
              backgroundColor="cardbg"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              <TouchableOpacity activeOpacity={0.7} onPress={() => handleSubmit()}>
                <Box
                  height={64}
                  backgroundColor={
                    dirty || selectedImage !== activeAccount?.image ? 'primary' : 'bg11'
                  }
                  borderRadius={32}
                  justifyContent="center"
                  alignItems="center"
                  style={{ opacity: dirty || selectedImage !== activeAccount?.image ? 1 : 0.6 }}
                >
                  <Text variant="h10" color="black" fontWeight="700">
                    Save Changes
                  </Text>
                </Box>
              </TouchableOpacity>
            </Box>
          </Box>
        )}
      </Formik>
    </Box>
  );
};

export default AccountInfo;
