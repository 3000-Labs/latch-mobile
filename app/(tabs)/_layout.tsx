import { CustomTabBar } from '@/src/components/CustomTabBar';
import { DrawerProvider } from '@/src/context/drawer-context';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import Profile from './profile';

const TabsLayout = () => {
  return (
    <DrawerProvider drawerContent={<Profile />}>
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen name="index" options={{ title: 'Home' }} />
          <Tabs.Screen name="swap" options={{ title: 'Swap' }} />
          <Tabs.Screen name="history" options={{ title: 'History' }} />
          <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
          <Tabs.Screen name="profile" options={{ href: null }} />
        </Tabs>
      </View>
    </DrawerProvider>
  );
};

export default TabsLayout;
