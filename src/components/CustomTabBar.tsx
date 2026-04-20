import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/theme';

const TAB_ITEMS = [
  { name: 'home', icon: 'home', label: 'Home' },
  { name: 'search', icon: 'search', label: 'Search' },
  { name: 'orders', icon: 'bag', label: 'Orders' },
  { name: 'profile', icon: 'person', label: 'Profile' },
];

export function CustomTabBar({ state, navigation }: any) {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? 'rgba(21,19,17,0.85)' : 'rgba(255,255,255,0.85)' }]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 100}
        style={StyleSheet.absoluteFill}
        tint={isDark ? 'dark' : 'light'}
      />
      <View style={[styles.border, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} />
      <View style={styles.tabBarInner}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const item = TAB_ITEMS[index];
          const iconName = isFocused ? `${item.icon}` : `${item.icon}-outline`;
          const color = isFocused ? theme.colors.primary : theme.colors.textSecondary;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={iconName as any}
                  size={22}
                  color={color}
                  style={isFocused ? styles.focusedIcon : null}
                />
              </View>
              <Text style={[styles.label, { color }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  border: {
    height: 1,
  },
  tabBarInner: {
    flexDirection: 'row',
    height: 60,
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  focusedIcon: {
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF3B30',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
