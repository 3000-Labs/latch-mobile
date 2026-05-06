import Box from '@/src/components/shared/Box';
import Switch from '@/src/components/shared/Switch';
import Text from '@/src/components/shared/Text';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@shopify/restyle';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BIOMETRIC_ENABLED_KEY } from '../(auth)/biometric';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

const Profile = (props: any) => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clearAll } = useWalletStore();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  const closeDrawer = () => {
    props.navigation.closeDrawer();
  };

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

  const SettingItem = ({
    icon,
    label,
    value,
    onPress,
    showChevron = true,
    rightElement,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Box
        flexDirection="row"
        alignItems="center"
        paddingVertical="m"
        paddingHorizontal="m"
        backgroundColor="bg900"
        borderRadius={16}
        mb="s"
      >
        <Box
          width={36}
          height={36}
          borderRadius={10}
          backgroundColor="bg800"
          justifyContent="center"
          alignItems="center"
          mr="m"
        >
          <Ionicons name={icon} size={20} color={theme.colors.textPrimary} />
        </Box>
        <Text variant="p7" color="textPrimary" flex={1}>
          {label}
        </Text>
        {value && (
          <Text variant="p7" color="textSecondary" mr="s">
            {value}
          </Text>
        )}
        {rightElement}
        {showChevron && (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        )}
      </Box>
    </TouchableOpacity>
  );

  return (
    <Box flex={1} backgroundColor="mainBackground" style={{ paddingTop: insets.top }}>
      <StatusBar style="light" />

      {/* Header */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Box height={56} justifyContent="center" alignItems="flex-end" paddingHorizontal="m">
          <TouchableOpacity onPress={closeDrawer}>
            <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </Box>
        {/* Profile Card */}
        <Box alignItems="center" mb="xl">
          <Box
            width={DRAWER_WIDTH - 32}
            backgroundColor="bg900"
            borderRadius={24}
            height={120}
            paddingVertical="m"
            alignItems="center"
          >
            <Box mb="s">
              <Image
                source={require('@/src/assets/token/user.png')}
                style={{ width: 40, height: 40, borderRadius: 40 }}
              />
            </Box>
            <Text variant="h10" color="textPrimary" mb="xs">
              German Bushbaby
            </Text>
            <Box flexDirection="row" alignItems="center">
              <Text variant="p7" color="textSecondary" mr="xs">
                GABC...XYZ1
              </Text>
              <TouchableOpacity>
                <Ionicons name="copy-outline" size={14} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </Box>
          </Box>
        </Box>

        <Box paddingHorizontal="m">
          {/* Account Section */}
          <Box mb="l">
            <Text variant="p7" color="textSecondary" mb="s" style={{ marginLeft: 4 }}>
              Account
            </Text>
            <SettingItem icon="person-outline" label="Account" />
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
            <SettingItem icon="globe-outline" label="Network" value="Public" />
            <SettingItem icon="notifications-outline" label="Notifications" />
          </Box>

          {/* Support Section */}
          <Box mb="l">
            <Text variant="p7" color="textSecondary" mb="s" style={{ marginLeft: 4 }}>
              Support
            </Text>
            <SettingItem icon="help-circle-outline" label="Help & Support" />
            <SettingItem icon="information-circle-outline" label="About Latch" value="v1.0.0" />
          </Box>
          {/* Logout — fixed at the bottom of the drawer */}
          <Box pb="l" style={{ paddingBottom: insets.bottom + 16 }}>
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.7}>
              <Box
                flexDirection="row"
                alignItems="center"
                paddingVertical="m"
                paddingHorizontal="m"
                backgroundColor="bg900"
                borderRadius={16}
              >
                <Box
                  width={36}
                  height={36}
                  borderRadius={10}
                  backgroundColor="bg800"
                  justifyContent="center"
                  alignItems="center"
                  mr="m"
                >
                  <Ionicons name="log-out-outline" size={20} color={theme.colors.danger900} />
                </Box>
                <Text variant="p7" color="danger900" flex={1}>
                  Log Out
                </Text>
              </Box>
            </TouchableOpacity>
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
};

export default Profile;
