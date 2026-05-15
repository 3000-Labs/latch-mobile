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

import AddressBookForm from '@/src/components/address-book/AddressBookForm';
import AddressBookItem from '@/src/components/address-book/AddressBookItem';
import EmptyAddressBook from '@/src/components/address-book/EmptyAddressBook';
import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { useAddressBook } from '@/src/hooks/use-address-book';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ScreenState = 'LIST' | 'FORM';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const AddressBookSheet = ({ visible, onClose }: Props) => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const [screenState, setScreenState] = useState<ScreenState>('LIST');
  const { entries: addresses, addEntry } = useAddressBook();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setScreenState('LIST');
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

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleBack = () => {
    if (screenState === 'FORM') {
      setScreenState('LIST');
    } else {
      handleClose();
    }
  };

  const handleAddAddress = (values: any, { resetForm }: any) => {
    addEntry(values);
    resetForm();
    setScreenState('LIST');
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleBack}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? theme.colors.cardbg : theme.colors.mainBackground,
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY }],
              maxHeight: SCREEN_HEIGHT * 0.9,
              minHeight: SCREEN_HEIGHT * 0.95,
            },
          ]}
        >
          <BottomSheetHandle />

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
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>

            <Text variant="h10" color="textPrimary" fontWeight="700">
              Address Book
            </Text>

            <Box width={40} alignItems="flex-end">
              {screenState === 'LIST' && addresses.length > 0 && (
                <TouchableOpacity
                  onPress={() => setScreenState('FORM')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              )}
            </Box>
          </Box>

          {screenState === 'LIST' ? (
            addresses.length === 0 ? (
              <EmptyAddressBook onAdd={() => setScreenState('FORM')} />
            ) : (
              <Box flex={1}>
                <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}>
                  {addresses.map((item) => (
                    <AddressBookItem key={item.id} label={item.label} address={item.address} />
                  ))}
                </ScrollView>
              </Box>
            )
          ) : (
            <AddressBookForm onSubmit={handleAddAddress} />
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
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
});

export default AddressBookSheet;
