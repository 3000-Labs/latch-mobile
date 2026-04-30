import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import Switch from '@/src/components/shared/Switch';
import Box from '@/src/components/shared/Box';
import Button from '@/src/components/shared/Button';
import Text from '@/src/components/shared/Text';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';

const NOTIF_PUSH_KEY = '@latch_notif_push';
const NOTIF_PRICE_KEY = '@latch_notif_price';
const NOTIF_TX_KEY = '@latch_notif_tx';

type NotificationSetting = {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  stateKey: 'push' | 'price' | 'tx';
};

const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    key: NOTIF_PUSH_KEY,
    label: 'Push Notifications',
    description: 'Receive alerts directly on your device',
    icon: 'notifications-outline',
    stateKey: 'push',
  },
  {
    key: NOTIF_PRICE_KEY,
    label: 'Price Alerts',
    description: 'Get notified on significant price movements',
    icon: 'trending-up-outline',
    stateKey: 'price',
  },
  {
    key: NOTIF_TX_KEY,
    label: 'Transaction Updates',
    description: 'Know when funds arrive or leave your wallet',
    icon: 'swap-horizontal-outline',
    stateKey: 'tx',
  },
];

const ASYNC_KEYS_TO_CLEAR = [
  'latch_onboarding_complete',
  '@latch_theme_mode',
  'latch_biometric_enabled',
  NOTIF_PUSH_KEY,
  NOTIF_PRICE_KEY,
  NOTIF_TX_KEY,
];

const Profile = () => {
  const theme = useTheme<Theme>();
  const statusBarStyle = useStatusBarStyle();
  const router = useRouter();
  const { clearAll } = useWalletStore();

  const [settings, setSettings] = useState({ push: false, price: false, tx: false });
  const [loaded, setLoaded] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const [push, price, tx] = await Promise.all([
        AsyncStorage.getItem(NOTIF_PUSH_KEY),
        AsyncStorage.getItem(NOTIF_PRICE_KEY),
        AsyncStorage.getItem(NOTIF_TX_KEY),
      ]);
      setSettings({
        push: push === 'true',
        price: price === 'true',
        tx: tx === 'true',
      });
      setLoaded(true);
    };
    loadSettings();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'This will remove your wallet and all credentials from this device. Make sure you have your recovery phrase saved before continuing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await clearAll();
              await AsyncStorage.multiRemove(ASYNC_KEYS_TO_CLEAR);
              router.replace('/onboarding');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
    );
  };

  const handleToggle = async (stateKey: 'push' | 'price' | 'tx', storageKey: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [stateKey]: value }));
    await AsyncStorage.setItem(storageKey, value ? 'true' : 'false');
  };

  if (!loaded) return null;

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <StatusBar style={statusBarStyle} />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.m,
          paddingTop: 60,
          paddingBottom: 40,
        }}
      >
        {/* Page Title */}
        <Box mb="xl">
          <Text variant="h7" fontSize={28} fontWeight="700" color="textPrimary">
            Settings
          </Text>
        </Box>

        {/* Notifications Section */}
        <Text variant="body" fontWeight="700" color="textSecondary" mb="m" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          Notifications
        </Text>

        <Box
          backgroundColor={statusBarStyle !== 'light' ? 'text50' : 'gray900'}
          borderRadius={16}
          borderWidth={1}
          borderColor="gray800"
          overflow="hidden"
          mb="xl"
        >
          {NOTIFICATION_SETTINGS.map((item, index) => (
            <Box key={item.key}>
              <Box
                flexDirection="row"
                alignItems="center"
                paddingHorizontal="m"
                paddingVertical="m"
                gap="m"
              >
                <Box
                  width={40}
                  height={40}
                  borderRadius={10}
                  backgroundColor="bg800"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Ionicons name={item.icon} size={20} color={theme.colors.primary700} />
                </Box>
                <Box flex={1}>
                  <Text variant="body" fontWeight="600" color="textPrimary">
                    {item.label}
                  </Text>
                  <Text variant="body" color="textSecondary" fontSize={13} mt="xs">
                    {item.description}
                  </Text>
                </Box>
                <Switch
                  value={settings[item.stateKey]}
                  onValueChange={(val) => handleToggle(item.stateKey, item.key, val)}
                />
              </Box>
              {index < NOTIFICATION_SETTINGS.length - 1 && (
                <Box height={1} backgroundColor="gray800" marginHorizontal="m" />
              )}
            </Box>
          ))}
        </Box>
        {/* Account Section */}
        <Text
          variant="body"
          fontWeight="700"
          color="textSecondary"
          mb="m"
          style={{ textTransform: 'uppercase', letterSpacing: 1 }}
        >
          Account
        </Text>

        <Box
          backgroundColor={statusBarStyle !== 'light' ? 'text50' : 'gray900'}
          borderRadius={16}
          borderWidth={1}
          borderColor="gray800"
          overflow="hidden"
          mb="xl"
        >
          <Button
            label={loggingOut ? 'Logging out…' : 'Log Out'}
            variant="secondary"
            onPress={handleLogout}
            disabled={loggingOut}
            bg={statusBarStyle !== 'light' ? 'text50' : 'gray900'}
            labelColor="danger900"
            height={56}
            leftIcon={
              <Ionicons name="log-out-outline" size={20} color={theme.colors.danger900} />
            }
          />
        </Box>
      </ScrollView>
    </Box>
  );
};

export default Profile;
