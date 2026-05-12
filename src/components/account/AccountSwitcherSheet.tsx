import { deploySmartAccount as deploySmartAccountPasskey } from '@/src/api/passkey';
import { deploySmartAccount as deploySmartAccountEd25519 } from '@/src/api/smart-account';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { createPasskeyCredential, storePasskeyCredentialAtIndex } from '@/src/lib/passkey-webauthn';
import { SECURE_KEYS, useWalletStore, WalletAccount } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { shortenAddress } from '@/src/utils';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const AccountSwitcherSheet = ({ visible, onClose }: Props) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const {
    accounts,
    activeAccountIndex,
    mnemonic,
    switchAccount,
    addAccount,
    addPasskeyAccount,
    updateAccountSmartAddress,
  } = useWalletStore();

  const [deployingIndex, setDeployingIndex] = useState<number | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  // Slide-up animation
  const translateY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      setDeployError(null);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const handleSwitch = async (listIndex: number) => {
    if (listIndex === activeAccountIndex) {
      onClose();
      return;
    }
    await switchAccount(listIndex);
    onClose();
  };

  const handleAddAccount = async () => {
    if (isAddingAccount) return;
    const currentLength = accounts.length;
    setIsAddingAccount(true);
    setDeployError(null);

    try {
      if (mnemonic) {
        // ── Mnemonic path: derive next BIP-44 account then deploy ─────────────
        const newAccount = await addAccount();
        if (!newAccount) return;

        const result = await deploySmartAccountEd25519(newAccount.publicKeyHex);
        await updateAccountSmartAddress(newAccount.index, result.smartAccountAddress);
      } else {
        // ── Passkey path: create a new P-256 credential then deploy ───────────
        const requiresBiometric = await SecureStore.getItemAsync(
          SECURE_KEYS.PASSKEY_REQUIRES_BIOMETRIC,
        );
        const useBiometric = requiresBiometric !== 'false';
        const credential = createPasskeyCredential();
        await storePasskeyCredentialAtIndex(credential, currentLength, useBiometric);
        const newAccount = await addPasskeyAccount(
          credential.credentialId,
          credential.publicKeyHex,
        );

        const keyDataHex = credential.publicKeyHex + credential.credentialId;
        const result = await deploySmartAccountPasskey(credential.credentialId, keyDataHex, true);
        if (result.error) throw new Error(result.error);
        await updateAccountSmartAddress(newAccount.index, result.smartAccountAddress);
      }

      await switchAccount(currentLength);
      onClose();
    } catch (err: any) {
      // Account entry was created — user can retry deployment via the "Deploy" button on the new account row
      setDeployError(err?.message ?? 'Account created but deployment failed. Tap Deploy to retry.');
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleDeploy = async (account: WalletAccount, listIndex: number) => {
    setDeployingIndex(listIndex);
    setDeployError(null);
    try {
      if (account.credentialId) {
        // Passkey account: deploy using the stored passkey credential.
        // Pass skipCache=true so the function doesn't return the active account's
        // address instead of deploying a fresh smart account for this credential.
        const keyDataHex = account.publicKeyHex + account.credentialId;
        const result = await deploySmartAccountPasskey(account.credentialId, keyDataHex, true);
        if (result.error) throw new Error(result.error);
        await updateAccountSmartAddress(account.index, result.smartAccountAddress);
        if (listIndex === activeAccountIndex) {
          await SecureStore.setItemAsync(SECURE_KEYS.SMART_ACCOUNT, result.smartAccountAddress);
        }
      } else {
        // Mnemonic account: deploy using the Ed25519 public key
        if (!mnemonic) return;
        const result = await deploySmartAccountEd25519(account.publicKeyHex);
        await updateAccountSmartAddress(account.index, result.smartAccountAddress);
        if (listIndex === activeAccountIndex) {
          await SecureStore.setItemAsync(SECURE_KEYS.SMART_ACCOUNT, result.smartAccountAddress);
        }
      }
    } catch (err: any) {
      setDeployError(err?.message ?? 'Deployment failed');
    } finally {
      setDeployingIndex(null);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? theme.colors.gray900 : theme.colors.mainBackground,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle */}
        <Box alignItems="center" pt="m" pb="s">
          <Box
            width={40}
            height={4}
            borderRadius={2}
            backgroundColor={isDark ? 'gray800' : 'gray200'}
          />
        </Box>

        {/* Title row */}
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal="m"
          pb="m"
        >
          <Text variant="h9" color="textPrimary" fontWeight="700">
            My Accounts
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </Box>

        {/* Account list */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
          {accounts.map((account, listIndex) => {
            const isActive = listIndex === activeAccountIndex;
            const isDeploying = deployingIndex === listIndex;
            // Show deploy button for any account that hasn't been deployed yet,
            // whether it's a mnemonic account (index >= 0) or a passkey account (credentialId set).
            const needsDeploy = !account.smartAccountAddress;

            return (
              <TouchableOpacity
                key={account.index}
                activeOpacity={0.7}
                onPress={() => handleSwitch(listIndex)}
                disabled={isDeploying}
              >
                <Box
                  flexDirection="row"
                  alignItems="center"
                  paddingHorizontal="m"
                  paddingVertical="m"
                  gap="m"
                  style={
                    isActive
                      ? {
                          backgroundColor: isDark
                            ? theme.colors.gray800
                            : theme.colors.primary700 + '12',
                        }
                      : {}
                  }
                >
                  {/* Avatar circle */}
                  <Box
                    width={44}
                    height={44}
                    borderRadius={22}
                    backgroundColor={isActive ? 'primary700' : isDark ? 'gray800' : 'gray100'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text
                      variant="h10"
                      color={isActive ? 'textWhite' : 'textSecondary'}
                      fontWeight="700"
                    >
                      {account.name.charAt(0)}
                    </Text>
                  </Box>

                  {/* Address info */}
                  <Box flex={1}>
                    <Text variant="h11" color="textPrimary" fontWeight="700">
                      {account.name}
                    </Text>
                    <Text variant="p7" color="textSecondary">
                      {account.smartAccountAddress
                        ? shortenAddress(account.smartAccountAddress)
                        : account.gAddress
                          ? shortenAddress(account.gAddress)
                          : 'Passkey account'}
                    </Text>
                  </Box>

                  {/* Right side: active check, deploy button, or spinner */}
                  {isDeploying ? (
                    <ActivityIndicator size="small" color={theme.colors.primary700} />
                  ) : isActive ? (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary700} />
                  ) : needsDeploy ? (
                    <TouchableOpacity
                      onPress={() => handleDeploy(account, listIndex)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Box
                        borderRadius={8}
                        paddingHorizontal="s"
                        paddingVertical="xs"
                        backgroundColor="primary700"
                      >
                        <Text variant="p7" color="textWhite" fontWeight="700">
                          Deploy
                        </Text>
                      </Box>
                    </TouchableOpacity>
                  ) : null}
                </Box>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Deploy error */}
        {deployError && (
          <Box paddingHorizontal="m" pt="s">
            <Text variant="p7" color="danger900">
              {deployError}
            </Text>
          </Box>
        )}

        {/* Add Account */}
        <Box paddingHorizontal="m" pt="m">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleAddAccount}
            disabled={isAddingAccount}
          >
            <Box
              flexDirection="row"
              alignItems="center"
              gap="m"
              paddingVertical="m"
              paddingHorizontal="m"
              borderRadius={12}
              style={{
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: isDark ? theme.colors.gray800 : theme.colors.gray200,
                opacity: isAddingAccount ? 0.6 : 1,
              }}
            >
              <Box
                width={44}
                height={44}
                borderRadius={22}
                backgroundColor={isDark ? 'gray800' : 'gray100'}
                justifyContent="center"
                alignItems="center"
              >
                {isAddingAccount ? (
                  <ActivityIndicator size="small" color={theme.colors.primary700} />
                ) : (
                  <Ionicons name="add" size={24} color={theme.colors.primary700} />
                )}
              </Box>
              <Text variant="h11" color="primary700" fontWeight="700">
                {isAddingAccount ? 'Creating account…' : 'Add Account'}
              </Text>
            </Box>
          </TouchableOpacity>
        </Box>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
});

export default AccountSwitcherSheet;
