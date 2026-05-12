import NotificationItem from '@/src/components/profile/NotificationItem';
import Box from '@/src/components/shared/Box';
import UtilityHeader from '@/src/components/shared/UtilityHeader';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView } from 'react-native';

const NotificationsScreen = () => {
  const router = useRouter();

  const [transactionNotifs, setTransactionNotifs] = React.useState(true);
  const [securityAlerts, setSecurityAlerts] = React.useState(true);
  const [appUpdates, setAppUpdates] = React.useState(false);

  const handleBack = () => {
    router.back();
  };

  return (
    <Box
      flex={1}
      backgroundColor="cardbg"
      style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}
    >
      <StatusBar style="light" />

      <UtilityHeader title="Notifications" onBack={handleBack} />

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
    </Box>
  );
};

export default NotificationsScreen;
