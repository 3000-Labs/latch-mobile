import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InviteEmailView from './InviteEmailView';
import MethodOptionCard from './MethodOptionCard';
import PasteAddressView from './PasteAddressView';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type SheetView = 'method' | 'paste-address' | 'invite-email';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanQR: () => void;
  onMemberAdded: (name: string, value: string, status: 'pending' | 'added') => void;
}

const ChooseMethodSheet: React.FC<Props> = ({ visible, onClose, onScanQR, onMemberAdded }) => {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [view, setView] = useState<SheetView>('method');

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      const timeout = setTimeout(() => setView('method'), 300);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      {/* Dim overlay — pointer-events none so touches fall through to the flex layer */}
      <View style={styles.backdrop} pointerEvents="none" />

      {/*
       * Flex column: backdrop spacer (flex:1) + sheet at bottom.
       * KeyboardAvoidingView shrinks the available space when the keyboard
       * appears, the flex:1 spacer absorbs the change and the sheet rides up.
       */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Tappable spacer above the sheet — closes the sheet */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.flex} />
        </TouchableWithoutFeedback>

        {/* Sheet — no absolute positioning; sits at the natural bottom of the column */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.cardbg,
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY }],
            },
          ]}
        >
          {view === 'method' && (
            <>
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                paddingHorizontal="m"
                pt="l"
                pb="m"
              >
                <Text variant="h8" color="textPrimary" fontWeight="700">
                  Choose Method
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isDark ? '#2A2A2A' : theme.colors.btnDisabled,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </Box>

              <Box paddingHorizontal="m">
                <MethodOptionCard
                  icon="enter-outline"
                  title="Paste Address"
                  subtitle="Add by wallet address"
                  onPress={() => setView('paste-address')}
                />
                <MethodOptionCard
                  icon="mail-outline"
                  title="Invite via Email"
                  subtitle="Send an invitation"
                  onPress={() => setView('invite-email')}
                  image={require('@/src/assets/icon/email.png')}
                />
                <MethodOptionCard
                  icon="qr-code-outline"
                  title="Scan QR Code"
                  subtitle="Scan member's QR code"
                  image={require('@/src/assets/icon/qr-code.png')}
                  onPress={onScanQR}
                />
              </Box>
            </>
          )}

          {view === 'paste-address' && (
            <PasteAddressView
              onClose={handleClose}
              onAdd={(name, address) => {
                handleClose();
                onMemberAdded(name, address, 'added');
              }}
            />
          )}

          {view === 'invite-email' && (
            <InviteEmailView
              onClose={handleClose}
              onAdd={(name, email) => {
                handleClose();
                onMemberAdded(name, email, 'pending');
              }}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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

export default ChooseMethodSheet;
