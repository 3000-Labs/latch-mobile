import { CustomTabBar } from '@/src/components/CustomTabBar'
import { Tabs } from 'expo-router'
import React from 'react'
import { View } from 'react-native'

const _layout = () => {
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                tabBar={(props) => <CustomTabBar {...props} />}
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
                <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
                <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
                <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
                <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
            </Tabs>
        </View>
    )
}

export default _layout