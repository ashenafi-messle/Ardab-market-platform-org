// ==============================================================================
// Ardab Market - Chapa Deep Link Callback Route
// ==============================================================================
// Target for return deep link: ardabmarket://payment/chapa/callback
// Handles returning customer from Chapa checkout.
// Never blindly trusts URL params; delegates verification to backend.
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing } from '@/theme';
import { paymentService } from '@/services/paymentService';

const RECOVERY_STORAGE_KEY = '@ardab_pending_payment';

export default function ChapaCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tx_ref?: string;
    status?: string;
    trx_ref?: string;
  }>();

  const [message, setMessage] = useState<string>('Verifying payment with Ardab Market...');

  useEffect(() => {
    let isMounted = true;

    async function handleReturn() {
      try {
        // Read recovery storage to locate orderId and paymentId
        const savedData = await AsyncStorage.getItem(RECOVERY_STORAGE_KEY);
        let parsed: any = null;
        if (savedData) {
          try {
            parsed = JSON.parse(savedData);
          } catch {}
        }

        const paymentId = parsed?.paymentId;
        const orderId = parsed?.orderId;

        if (paymentId) {
          // Perform authoritative backend verification
          const statusResult = await paymentService.getPaymentStatus(paymentId);
          if (isMounted) {
            router.replace(
              `/checkout/payment?orderId=${orderId}&paymentId=${paymentId}&status=${statusResult.status}` as any
            );
            return;
          }
        }

        // Fallback: if orderId is known, return to payment screen
        if (orderId) {
          router.replace(`/checkout/payment?orderId=${orderId}` as any);
        } else {
          router.replace('/(tabs)/orders' as any);
        }
      } catch (err: any) {
        console.warn('[ChapaCallback] Callback verification error:', err.message);
        router.replace('/(tabs)/orders' as any);
      }
    }

    handleReturn();

    return () => {
      isMounted = false;
    };
  }, [params, router]);

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  text: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
