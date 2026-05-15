import AccountSwitcherSheet from '@/src/components/account/AccountSwitcherSheet';
import AboutSheet from '@/src/components/profile/AboutSheet';
import AccountInfoSheet from '@/src/components/profile/AccountInfoSheet';
import AddressBookSheet from '@/src/components/profile/AddressBookSheet';
import DrawerProfileHeader from '@/src/components/profile/DrawerProfileHeader';
import HelpSupportSheet from '@/src/components/profile/HelpSupportSheet';
import LogoutItem from '@/src/components/profile/LogoutItem';
import LogoutPromptSheet from '@/src/components/profile/LogoutPromptSheet';
import NetworkSheet from '@/src/components/profile/NetworkSheet';
import NotificationSheet from '@/src/components/profile/NotificationSheet';
import PermissionsSheet from '@/src/components/profile/PermissionsSheet';
import PrivacyPolicySheet from '@/src/components/profile/PrivacyPolicySheet';
import RecoveryPhraseSheet from '@/src/components/profile/RecoveryPhraseSheet';
import SettingItem from '@/src/components/profile/SettingItem';
import SignersSheet from '@/src/components/profile/SignersSheet';
import Box from '@/src/components/shared/Box';
import Switch from '@/src/components/shared/Switch';
import Text from '@/src/components/shared/Text';
import { useDrawer } from '@/src/context/drawer-context';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@shopify/restyle';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BIOMETRIC_ENABLED_KEY } from '../(auth)/biometric';

const Profile = () => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clearAll, accounts, activeAccountIndex } = useWalletStore();
  const { closeDrawer } = useDrawer();
  const [accountInfoVisible, setAccountInfoVisible] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [signersVisible, setSignersVisible] = useState(false);
  const [permissionsVisible, setPermissionsVisible] = useState(false);
  const [addressBookVisible, setAddressBookVisible] = useState(false);
  const [networkVisible, setNetworkVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [helpSupportVisible, setHelpSupportVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const activeAccount = accounts[activeAccountIndex];

  if (!activeAccount) return null;

  const handleLogout = async () => {
    await clearAll();
    await AsyncStorage.multiRemove([BIOMETRIC_ENABLED_KEY, 'latch_onboarding_complete']);
    router.replace('/onboarding');
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
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </Box>

        <DrawerProfileHeader
          name={activeAccount?.name || 'Crownz'}
          address={activeAccount?.smartAccountAddress || activeAccount?.gAddress || ''}
          image={activeAccount?.image || null}
          onCopyAddress={async () => {
            if (activeAccount?.smartAccountAddress) {
              await Clipboard.setStringAsync(activeAccount?.smartAccountAddress);
            }
          }}
          onPress={() => setSwitcherVisible(true)}
        />

        <AccountSwitcherSheet visible={switcherVisible} onClose={() => setSwitcherVisible(false)} />
        <AccountInfoSheet
          visible={accountInfoVisible}
          onClose={() => setAccountInfoVisible(false)}
        />
        <RecoveryPhraseSheet visible={recoveryVisible} onClose={() => setRecoveryVisible(false)} />
        <SignersSheet visible={signersVisible} onClose={() => setSignersVisible(false)} />
        <PermissionsSheet
          visible={permissionsVisible}
          onClose={() => setPermissionsVisible(false)}
        />
        <AddressBookSheet
          visible={addressBookVisible}
          onClose={() => setAddressBookVisible(false)}
        />
        <NetworkSheet visible={networkVisible} onClose={() => setNetworkVisible(false)} />
        <NotificationSheet
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />
        <HelpSupportSheet
          visible={helpSupportVisible}
          onClose={() => setHelpSupportVisible(false)}
        />
        <AboutSheet visible={aboutVisible} onClose={() => setAboutVisible(false)} />
        <PrivacyPolicySheet visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
        <LogoutPromptSheet
          visible={logoutVisible}
          onClose={() => setLogoutVisible(false)}
          onConfirm={handleLogout}
        />

        <Box paddingHorizontal="m">
          {/* Account Section */}
          <Box mb="l">
            <Text variant="p7" color="textSecondary" mb="m" style={{ marginLeft: 4 }}>
              Account
            </Text>
            <SettingItem
              icon="person-outline"
              label="My Profile"
              onPress={() => setAccountInfoVisible(true)}
              image={require('@/src/assets/icon/user.png')}
            />
            <SettingItem
              icon="people-outline"
              label="My Accounts"
              onPress={() => setSwitcherVisible(true)}
              image={require('@/src/assets/icon/users.png')}
            />
            <SettingItem
              icon="book-outline"
              label="Address Book"
              onPress={() => setAddressBookVisible(true)}
            />
            <SettingItem
              icon="key-outline"
              label="Recovery Phrase"
              onPress={() => setRecoveryVisible(true)}
              image={require('@/src/assets/icon/key.png')}
            />
          </Box>

          {/* Security Section */}
          <Box mb="l">
            <Text variant="p7" color="textSecondary" mb="m" style={{ marginLeft: 4 }}>
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
            <SettingItem
              icon="keypad-outline"
              label="Signers"
              onPress={() => setSignersVisible(true)}
              image={require('@/src/assets/icon/monitor-ipad-mobile.png')}
            />
            <SettingItem
              icon="document-text-outline"
              label="Permissions"
              onPress={() => setPermissionsVisible(true)}
              image={require('@/src/assets/icon/mobile-shield-protection.png')}
            />
          </Box>

          {/* Preferences Section */}
          <Box mb="l">
            <Text variant="p7" color="textSecondary" mb="m" style={{ marginLeft: 4 }}>
              Preferences
            </Text>
            <SettingItem
              icon="globe-outline"
              label="Network"
              value={'Testnet'}
              onPress={() => setNetworkVisible(true)}
            />
            <SettingItem
              icon="notifications-outline"
              label="Notifications"
              onPress={() => setNotificationsVisible(true)}
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
              onPress={() => setHelpSupportVisible(true)}
            />
            <SettingItem
              icon="information-circle-outline"
              label="About Latch"
              value="v1.0.0"
              onPress={() => setAboutVisible(true)}
            />
            <SettingItem
              icon="document-text-outline"
              label="Privacy Policy"
              onPress={() => setPrivacyVisible(true)}
            />
          </Box>

          <LogoutItem onPress={() => setLogoutVisible(true)} bottomInset={insets.bottom} />
        </Box>
      </ScrollView>
    </Box>
  );
};

export default Profile;
