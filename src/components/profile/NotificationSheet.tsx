import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NotificationItem from '@/src/components/profile/NotificationItem';
import BottomSheetHandle from '@/src/components/shared/BottomSheetHandle';
import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { Theme } from '@/src/theme/theme';
import { useAppTheme } from '@/src/theme/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

const NotificationSheet = ({ visible, onClose }: Props) => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  const [transactionNotifs, setTransactionNotifs] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [appUpdates, setAppUpdates] = useState(false);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
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
            minHeight: SCREEN_HEIGHT * 0.9,
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
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <Text variant="h10" color="textPrimary" fontWeight="700">
            Notifications
          </Text>

          <Box width={40} />
        </Box>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <NotificationItem
            title="Transaction Notifications"
            description="Get notified about incoming and outgoing transactions"
            value={transactionNotifs}
            onValueChange={setTransactionNotifs}
          />
          <NotificationItem
            title="Security Alerts"
            description="Important security updates and warnings"
            value={securityAlerts}
            onValueChange={setSecurityAlerts}
          />
          <NotificationItem
            title="App Updates"
            description="New features and product announcements"
            value={appUpdates}
            onValueChange={setAppUpdates}
          />
        </ScrollView>
      </Animated.View>
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

export default NotificationSheet;
