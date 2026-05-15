import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
import AddSignerForm from './AddSignerForm';
import AddSignerSuccess from './AddSignerSuccess';
import RemoveSignerPrompt from './RemoveSignerPrompt';
import SwipeableSignerItem from './SwipeableSignerItem';

import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { useWalletStore } from '@/src/store/wallet';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SignersSheet = ({ visible, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const { accounts, activeAccountIndex } = useWalletStore();
  const activeAccount = accounts[activeAccountIndex];
  const [step, setStep] = useState<'list' | 'add' | 'confirm_delete' | 'success'>('list');
  const [signerToDelete, setSignerToDelete] = useState<any>(null);
  const [addedSignerName, setAddedSignerName] = useState('');

  const [signers, setSigners] = useState([
    {
      id: '1',
      name: 'My iPhone (This Device)',
      address: activeAccount?.smartAccountAddress || 'GXYZ...AB12',
      isPrimary: true,
    },
    {
      id: '2',
      name: 'iPad',
      address: 'H1J2...X9Y0',
      isPrimary: false,
    },
  ]);

  const handleDelete = (id: string) => {
    const signer = signers.find((s) => s.id === id);
    if (signer) {
      setSignerToDelete(signer);
      setStep('confirm_delete');
    }
  };

  const confirmDelete = () => {
    if (signerToDelete) {
      setSigners((prev) => prev.filter((s) => s.id !== signerToDelete.id));
      setSignerToDelete(null);
      setStep('list');
    }
  };

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setStep('list');
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

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
              minHeight:
                step === 'list'
                  ? 500
                  : step === 'confirm_delete'
                    ? 240
                    : step === 'success'
                      ? SCREEN_HEIGHT
                      : 500, // Reduced minHeight to allow keyboard to breathe
            },
          ]}
        >
          <BottomSheetHandle />

          {step === 'list' ? (
            <>
              {/* Header */}
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                paddingHorizontal="m"
                py="m"
                mb="m"
              >
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>

                <Text variant="h10" color="textPrimary" fontWeight="700">
                  Signers
                </Text>

                <TouchableOpacity
                  onPress={() => setStep('add')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </Box>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              >
                {/* Signer Management Card */}
                <Box backgroundColor="bg11" borderRadius={24} padding="l" mb="l">
                  <Text variant="h11" color="textPrimary" fontWeight="700" mb="s">
                    Signer Management
                  </Text>
                  <Text variant="p7" color="textSecondary" lineHeight={22} mb="l">
                    Signers are devices or accounts allowed to authorize transactions. Requiring
                    multiple signers adds extra security.
                  </Text>

                  <Box
                    backgroundColor={isDark ? 'gray900' : 'cardbg'}
                    borderRadius={16}
                    padding="m"
                    flexDirection="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Text variant="p7" color="textSecondary">
                      Active Signers
                    </Text>
                    <Text variant="h10" color="textPrimary" fontWeight="700">
                      {signers.length}
                    </Text>
                  </Box>
                </Box>

                {/* Signers List */}
                {signers.map((signer) => (
                  <SwipeableSignerItem key={signer.id} signer={signer} onDelete={handleDelete} />
                ))}
              </ScrollView>
            </>
          ) : step === 'add' ? (
            <AddSignerForm
              onBack={() => setStep('list')}
              onSubmit={(values) => {
                const newSigner = {
                  id: Math.random().toString(),
                  name: values.name,
                  address: values.address,
                  isPrimary: false,
                };
                setSigners((prev) => [...prev, newSigner]);
                setAddedSignerName(values.name);
                setStep('success');
              }}
            />
          ) : step === 'confirm_delete' ? (
            <RemoveSignerPrompt
              signerName={signerToDelete?.name || ''}
              onCancel={() => {
                setSignerToDelete(null);
                setStep('list');
              }}
              onConfirm={confirmDelete}
            />
          ) : (
            <AddSignerSuccess signerName={addedSignerName} onContinue={() => setStep('list')} />
          )}
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

export default SignersSheet;
