import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AgentAuthProvider } from '../store/AgentAuthContext';
import { Colors } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AgentAuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="orders/[id]" />
          <Stack.Screen name="customers/[id]" />
          <Stack.Screen name="notifications/index" />
          <Stack.Screen name="finance/commissions" />
          <Stack.Screen name="profile/personal" />
          <Stack.Screen name="profile/security" />
          <Stack.Screen name="profile/remember-me" />
          <Stack.Screen name="profile/notifications" />
          <Stack.Screen name="profile/about" />
        </Stack>
      </AgentAuthProvider>
    </SafeAreaProvider>
  );
}

