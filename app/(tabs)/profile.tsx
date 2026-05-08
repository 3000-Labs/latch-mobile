import LogoutItem from '@/src/components/profile/LogoutItem';
import ProfileCard from '@/src/components/profile/ProfileCard';
import SettingItem from '@/src/components/profile/SettingItem';
import Box from '@/src/components/shared/Box';
import Switch from '@/src/components/shared/Switch';
import Text from '@/src/components/shared/Text';
import { useDrawer } from '@/src/context/drawer-context';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@shopify/restyle';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BIOMETRIC_ENABLED_KEY } from '../(auth)/biometric';

const Profile = () => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clearAll } = useWalletStore();
  const { closeDrawer } = useDrawer();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          await AsyncStorage.multiRemove([BIOMETRIC_ENABLED_KEY, 'latch_onboarding_complete']);
          router.replace('/onboarding');
        },
      },
    ]);
  };

  return (
    <Box flex={1} backgroundColor="cardbg" style={{ paddingTop: insets.top }}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Box height={56} justifyContent="center" alignItems="flex-end" paddingHorizontal="m">
          <TouchableOpacity onPress={closeDrawer}>
            <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </Box>

        <ProfileCard name="German Bushbaby" address="GABC...XYZ1" />

        <Box paddingHorizontal="m">
          {/* Account Section */}
          <Box mb="l">
            <Text variant="p7" color="textSecondary" mb="s" style={{ marginLeft: 4 }}>
              Account
            </Text>
            <SettingItem icon="person-outline" label="Account" />
            <SettingItem
              icon="book-outline"
              label="Address Book"
              onPress={() => {
                closeDrawer();
                router.push('/address-book');
              }}
            />
            <SettingItem icon="key-outline" label="Recovery Phrase" />
          </Box>

          {/* Security Section */}
          <Box mb="l">
            <Text variant="p7" color="textSecondary" mb="s" style={{ marginLeft: 4 }}>
              Security
            </Text>
            <SettingItem
              icon="finger-print-outline"
              label="Biometrics Authentication"
              showChevron={false}
              rightElement={
                <Switch value={biometricsEnabled} onValueChange={setBiometricsEnabled} />
              }
            />
            <SettingItem icon="lock-closed-outline" label="Passcode" />
          </Box>

          {/* Preferences Section */}
          <Box mb="l">
            <Text variant="p7" color="textSecondary" mb="s" style={{ marginLeft: 4 }}>
              Preferences
            </Text>
            <SettingItem
              icon="globe-outline"
              label="Network"
              value="Public"
              onPress={() => {
                closeDrawer();
                router.push('/network-settings');
              }}
            />
            <SettingItem
              icon="notifications-outline"
              label="Notifications"
              onPress={() => {
                closeDrawer();
                router.push('/notification');
              }}
            />
          </Box>

          {/* Support Section */}
          <Box mb="l">
            <Text variant="p7" color="textSecondary" mb="s" style={{ marginLeft: 4 }}>
              Support
            </Text>
            <SettingItem
              icon="help-circle-outline"
              label="Help & Support"
              onPress={() => {
                closeDrawer();
                router.push('/help-support');
              }}
            />
            <SettingItem
              icon="information-circle-outline"
              label="About Latch"
              value="v1.0.0"
              onPress={() => {
                closeDrawer();
                router.push('/about');
              }}
            />
          </Box>

          <LogoutItem onPress={handleLogout} bottomInset={insets.bottom} />
        </Box>
      </ScrollView>
    </Box>
  );
};

export default Profile;
