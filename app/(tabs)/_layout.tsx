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
                <Tabs.Screen name="index" options={{ title: 'Home' }} />
                <Tabs.Screen name="swap" options={{ title: 'Swap' }} />
                <Tabs.Screen name="history" options={{ title: 'History' }} />
                <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
            </Tabs>
        </View>
    )
}

export default _layout