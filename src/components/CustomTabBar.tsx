import { useTheme } from '@shopify/restyle';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAppTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/theme';

const TAB_ITEMS = [
  { name: 'index', icon: Home, label: 'Home' },
  { name: 'swap', icon: Swap, label: 'Swap' },
  { name: 'history', icon: History, label: 'History' },
  { name: 'explore', icon: Explore, label: 'Explore' },
];

export function CustomTabBar({ state, navigation }: any) {
  const theme = useTheme<Theme>();
  const { isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)' },
      ]}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 100}
        style={StyleSheet.absoluteFill}
        tint={isDark ? 'dark' : 'light'}
      />
      <View
        style={[
          styles.border,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
        ]}
      />
      <View style={styles.tabBarInner}>
        {TAB_ITEMS.map((item, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const route = state.routes.find((r: any) => r.name === item.name);
            if (route) {
              const event = navigation.emit({
                // type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            } else {
              // Fallback or navigate by name if route not in state yet
              navigation.navigate(item.name);
            }
          };

          const color = isFocused
            ? theme.colors.primary700
            : isDark
              ? theme.colors.gray600
              : theme.colors.gray500;

          return (
            <TouchableOpacity
              key={item.name}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>{item.icon({ width: 24, color })}</View>
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
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  border: {
    height: 1,
  },
  tabBarInner: {
    flexDirection: 'row',
    height: 60,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});

function Home({ width = 24, color }: { width: number; color: string }) {
  return (
    <Svg width={width} height="24" viewBox="0 0 24 24" fill="none">
      <Path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M19.842 8.29876L13.842 3.63176C12.759 2.78876 11.242 2.78876 10.158 3.63176L4.158 8.29876C3.427 8.86676 3 9.74076 3 10.6668V17.9998C3 19.6568 4.343 20.9998 6 20.9998H18C19.657 20.9998 21 19.6568 21 17.9998V10.6668C21 9.74076 20.573 8.86676 19.842 8.29876Z"
        stroke={color}
        stroke-width="1.5"
      />
      <Path
        d="M16 14.2378C13.79 16.4478 10.208 16.4478 8 14.2378"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
}

export function Swap({ width = 24, color }: { width: number; color: string }) {
  return (
    <Svg width={width} height={width} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 1L21 5L17 9"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M3 11V9C3 7.93913 3.42143 6.92172 4.17157 6.17157C4.92172 5.42143 5.93913 5 7 5H21"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M7 23L3 19L7 15"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M21 13V15C21 16.0609 20.5786 17.0783 19.8284 17.8284C19.0783 18.5786 18.0609 19 17 19H3"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
}

function History({ width = 24, color }: { width: number; color: string }) {
  return (
    <Svg width={width} height={width} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12.0003"
        cy="12.0003"
        r="9.00375"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M15.4554 13.1515L12 12.0001V5.99756"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
}

function Explore({ width = 24, color }: { width: number; color: string }) {
  return (
    <Svg width={width} height={width} viewBox="0 0 24 24" fill="none">
      <Path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M7.89863 15.5084L9.0391 9.82399C9.11855 9.42799 9.42833 9.11861 9.82443 9.03966L15.5088 7.90319C15.6727 7.87057 15.842 7.92192 15.9602 8.04007C16.0783 8.15822 16.1297 8.32756 16.097 8.49143L14.9606 14.1758C14.8813 14.5715 14.572 14.8808 14.1762 14.9601L8.49187 16.1016C8.3262 16.1368 8.15397 16.0858 8.03421 15.966C7.91445 15.8463 7.86343 15.674 7.89863 15.5084Z"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Circle
        cx="12.0003"
        cy="12.0003"
        r="9.00375"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
}
