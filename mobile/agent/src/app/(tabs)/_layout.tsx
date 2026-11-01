import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '../../theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';

  // Automatic adaptive safe-area calculation for all mobile screen types:
  // 1. Android devices with 3-button system navigation bar ("backer bar"):
  //    - If insets.bottom is reported (edge-to-edge mode ~48dp or gesture bar ~24dp),
  //      it uses insets.bottom plus a comfortable cushion so nothing is obscured.
  //    - If insets.bottom is 0 (legacy window layout or unmeasured initial state),
  //      it enforces a guaranteed safe baseline padding (16dp) so icons and labels
  //      are never covered by the phone's back/home navigation bar.
  // 2. iOS devices with home indicator (insets.bottom ~34dp) or home button (insets.bottom === 0).
  // 3. Web and tablets with horizontal & safe side insets.
  const BASE_CONTENT_HEIGHT = 56;
  const bottomInset = insets.bottom;
  const safeBottomPadding =
    bottomInset > 0
      ? bottomInset + (isAndroid ? 6 : 4)
      : isAndroid
      ? 16
      : 8;

  const tabBarHeight = BASE_CONTENT_HEIGHT + safeBottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: safeBottomPadding,
          paddingTop: 8,
          paddingLeft: Math.max(insets.left, 8),
          paddingRight: Math.max(insets.right, 8),
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: Typography.fontSize.tiny,
          fontWeight: Typography.fontWeight.semibold,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
