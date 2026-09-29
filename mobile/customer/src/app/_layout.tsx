import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp, AuthProvider, useAuth } from '@/store';
import { Colors } from '@/theme';
import { wakeBackendServer } from '@/constants/api';

// Keep the splash screen visible while assets/fonts load
SplashScreen.preventAutoHideAsync().catch(() => {});

function NavigationStack() {
  const { language } = useApp();
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  return (
    <Stack
      key={language}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="products" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="wishlist" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="orders/[id]" />
      <Stack.Screen name="orders/tracking" />
      <Stack.Screen name="support" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    wakeBackendServer().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <NavigationStack />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
