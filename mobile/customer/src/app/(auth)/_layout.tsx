import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="create-password" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
