import { deploySmartAccount as deploySmartAccountPasskey } from '@/src/api/passkey';
import { deploySmartAccount as deploySmartAccountEd25519 } from '@/src/api/smart-account';
import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import { SHEET_HEIGHT } from '@/src/constants/constants';
import { createPasskeyCredential, storePasskeyCredentialAtIndex } from '@/src/lib/passkey-webauthn';
import { SECURE_KEYS, useWalletStore, WalletAccount } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { useTheme } from '@shopify/restyle';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { addSharedWalletByAddress } from '@/src/lib/add-shared-wallet';
import LoadingBlur from '../shared/LoadingBlur';
import AccountItem from './AccountItem';
import AccountSectionHeader from './AccountSectionHeader';
import AccountSheetHeader from './AccountSheetHeader';
import AddAccountInfo from './AddAccountInfo';
import AddAccountPrompt from './AddAccountPrompt';
import AddSharedWalletForm from './AddSharedWalletForm';
import MultisigSignersSection from './MultisigSignersSection';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

type SheetStep = 'list' | 'add-prompt' | 'add-info' | 'add-shared' | 'signers';

const AccountSwitcherSheet = ({ visible, onClose }: Props) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const {
    accounts,
    activeAccountIndex,
    avatars,
    mnemonic,
    switchAccount,
    addAccount,
    addPasskeyAccount,
    updateAccountSmartAddress,
    renameAccount,
    setAccountImage,
  } = useWalletStore();

  const [step, setStep] = useState<SheetStep>('list');
  const [deployingIndex, setDeployingIndex] = useState<number | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAddingShared, setIsAddingShared] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [signersFor, setSignersFor] = useState<{ name: string; address: string } | null>(null);

  // Slide-up animation
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
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
      // Reset step when modal closes
      setTimeout(() => setStep('list'), 300);
    }
  }, [visible, translateY]);

  const handleSwitch = (listIndex: number) => {
    if (listIndex === activeAccountIndex || isSwitching) {
      onClose();
      return;
    }
    setIsSwitching(true);
    switchAccount(listIndex).finally(() => setIsSwitching(false));
    onClose();
  };

  const handleCreateAccount = async (name: string, image: string | null) => {
    if (isAddingAccount) return;
    const currentLength = accounts.length;
    setIsAddingAccount(true);

    try {
      let newAccount: WalletAccount | null = null;
      if (mnemonic) {
        newAccount = await addAccount();
        if (!newAccount) return;

        // Apply custom name and image
        await renameAccount(currentLength, name);
        if (image) await setAccountImage(currentLength, image);

        const result = await deploySmartAccountEd25519(newAccount.publicKeyHex, {
          skipFunding: true,
        });
        await updateAccountSmartAddress(newAccount.index, result.smartAccountAddress);
      } else {
        const requiresBiometric = await SecureStore.getItemAsync(
          SECURE_KEYS.PASSKEY_REQUIRES_BIOMETRIC,
        );
        const useBiometric = requiresBiometric !== 'false';
        const credential = createPasskeyCredential();
        await storePasskeyCredentialAtIndex(credential, currentLength, useBiometric);
        newAccount = await addPasskeyAccount(credential.credentialId, credential.publicKeyHex);

        // Apply custom name and image
        await renameAccount(currentLength, name);
        if (image) await setAccountImage(currentLength, image);

        const keyDataHex = credential.publicKeyHex + credential.credentialId;
        const result = await deploySmartAccountPasskey(credential.credentialId, keyDataHex, true);
        if (result.error) throw new Error(result.error);
        await updateAccountSmartAddress(newAccount.index, result.smartAccountAddress);
      }

      switchAccount(currentLength);

      onClose();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.message || 'Failed to create account',
      });
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleAddSharedWallet = async (address: string, name: string) => {
    if (isAddingShared) return;
    setIsAddingShared(true);
    try {
      const account = await addSharedWalletByAddress(address, name);
      Toast.show({ type: 'success', text1: 'Multisig wallet added', text2: account.name });
      onClose();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Could not add wallet',
        text2: err?.message || 'Failed to add multisig wallet',
      });
    } finally {
      setIsAddingShared(false);
    }
  };

  const handleDeploy = async (account: WalletAccount, listIndex: number) => {
    setDeployingIndex(listIndex);
    try {
      if (account.credentialId) {
        const keyDataHex = account.publicKeyHex + account.credentialId;
        const result = await deploySmartAccountPasskey(account.credentialId, keyDataHex, true);
        if (result.error) throw new Error(result.error);
        await updateAccountSmartAddress(account.index, result.smartAccountAddress);
      } else {
        if (!mnemonic) return;
        const result = await deploySmartAccountEd25519(account.publicKeyHex, { skipFunding: true });
        await updateAccountSmartAddress(account.index, result.smartAccountAddress);
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Account deployed successfully',
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.message || 'Deployment failed',
      });
    } finally {
      setDeployingIndex(null);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'add-prompt':
        return (
          <AddAccountPrompt
            onBack={() => setStep('list')}
            onCreatePress={() => setStep('add-info')}
            onAddSharedPress={() => setStep('add-shared')}
          />
        );
      case 'add-shared':
        return (
          <AddSharedWalletForm
            onBack={() => setStep('add-prompt')}
            onSubmit={handleAddSharedWallet}
            isSubmitting={isAddingShared}
          />
        );
      case 'signers':
        return signersFor ? (
          <MultisigSignersSection
            walletName={signersFor.name}
            address={signersFor.address}
            onBack={() => setStep('list')}
          />
        ) : null;
      case 'add-info':
        return (
          <AddAccountInfo
            defaultName={`Account ${accounts.length + 1}`}
            onBack={() => setStep('add-prompt')}
            onSubmit={handleCreateAccount}
            isSubmitting={isAddingAccount}
          />
        );
      default: {
        // Split into regular and multisig groups while preserving each
        // account's ORIGINAL array position — handleSwitch/handleDeploy/isActive
        // all key off listIndex, so the index must survive the grouping.
        const regular: { account: WalletAccount; listIndex: number }[] = [];
        const multisig: { account: WalletAccount; listIndex: number }[] = [];
        accounts.forEach((account, listIndex) => {
          (account.isMultisig ? multisig : regular).push({ account, listIndex });
        });

        const renderAccount = ({
          account,
          listIndex,
        }: {
          account: WalletAccount;
          listIndex: number;
        }) => (
          <AccountItem
            key={account.index}
            account={account}
            isActive={listIndex === activeAccountIndex}
            onPress={() => handleSwitch(listIndex)}
            onDeploy={() => handleDeploy(account, listIndex)}
            onShowSigners={
              account.isMultisig && account.smartAccountAddress
                ? () => {
                    setSignersFor({
                      name: account.name,
                      address: account.smartAccountAddress as string,
                    });
                    setStep('signers');
                  }
                : undefined
            }
            isDeploying={deployingIndex === listIndex}
            avatarDataUri={avatars[account.publicKeyHex]}
          />
        );

        return (
          <>
            <AccountSheetHeader onClose={onClose} onAdd={() => setStep('add-prompt')} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              style={{ flexShrink: 1 }}
            >
              {regular.length > 0 && (
                <>
                  <AccountSectionHeader label="Regular accounts" count={regular.length} />
                  {regular.map(renderAccount)}
                </>
              )}
              {multisig.length > 0 && (
                <>
                  <AccountSectionHeader label="Multisig accounts" count={multisig.length} />
                  {multisig.map(renderAccount)}
                </>
              )}
            </ScrollView>
          </>
        );
      }
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
              flex: 1,
              marginTop: SCREEN_HEIGHT - SHEET_HEIGHT,
            },
          ]}
        >
          <BottomSheetHandle />
          {renderContent()}
          <LoadingBlur
            visible={isAddingAccount || deployingIndex !== null}
            text="Creating Account..."
            subText="Deploying your new Smart Account to the Stellar network. This only takes a moment."
          />
        </Animated.View>
      </KeyboardAvoidingView>

      <LoadingBlur visible={isSwitching} text="Switching account..." />
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
    minHeight: 300,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
});

export default AccountSwitcherSheet;
