// ==============================================================================
// Ardab Market - Chapa Payment Callback Screen (Web & Mobile Deep Link)
// ==============================================================================
// Target for return URLs:
// - Web: https://customer-phi-wheat.vercel.app/payment/chapa/callback?tx_ref=...
// - Android: ardabmarket://payment/chapa/callback?tx_ref=...
//
// Never assumes success from URL parameters.
// Authoritatively queries backend payment status and shows confirmed details.
// ==============================================================================

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader, AppButton } from '@/components/common';
import { paymentService, PaymentStatusResponse } from '@/services/paymentService';
import { formatPrice } from '@/localization';

const RECOVERY_STORAGE_KEY = '@ardab_pending_payment';

export default function ChapaCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tx_ref?: string;
    trx_ref?: string;
    status?: string;
  }>();

  const [verificationState, setVerificationState] = useState<'CONFIRMING' | 'SUCCESS' | 'FAILED'>('CONFIRMING');
  const [confirmedPayment, setConfirmedPayment] = useState<PaymentStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 6;
    const pollDelays = [1500, 2500, 3500, 5000, 6000, 8000];

    async function checkStatus() {
      try {
        // Read recovery storage or URL parameters to identify transaction
        const savedData = await AsyncStorage.getItem(RECOVERY_STORAGE_KEY);
        let parsed: any = null;
        if (savedData) {
          try {
            parsed = JSON.parse(savedData);
          } catch {}
        }

        const identifier = params.tx_ref || params.trx_ref || parsed?.txRef || parsed?.paymentId;

        if (!identifier) {
          if (isMounted) {
            setVerificationState('FAILED');
            setErrorMessage('No transaction reference found to verify payment.');
          }
          return;
        }

        // Authoritatively query backend for status & trigger on-demand verification
        const statusRes = await paymentService.getPaymentStatus(identifier);

        if (!isMounted) return;

        if (statusRes.status === 'SUCCESS' || statusRes.isSuccess) {
          setConfirmedPayment(statusRes);
          setVerificationState('SUCCESS');
          await AsyncStorage.removeItem(RECOVERY_STORAGE_KEY).catch(() => {});
          return;
        }

        if (statusRes.status === 'FAILED') {
          setVerificationState('FAILED');
          setErrorMessage(statusRes.failureReason || 'Payment could not be completed.');
          await AsyncStorage.removeItem(RECOVERY_STORAGE_KEY).catch(() => {});
          return;
        }

        // Status is PENDING or PROCESSING - retry with backoff
        pollCount++;
        if (pollCount < maxPolls) {
          const delay = pollDelays[pollCount] || 5000;
          pollTimerRef.current = setTimeout(checkStatus, delay);
        } else {
          // Polling exhausted but not failed: order is still processing
          setConfirmedPayment(statusRes);
          setVerificationState('CONFIRMING');
        }
      } catch (err: any) {
        if (!isMounted) return;
        pollCount++;
        if (pollCount < maxPolls) {
          pollTimerRef.current = setTimeout(checkStatus, 3000);
        } else {
          setVerificationState('FAILED');
          setErrorMessage(err?.message || 'Unable to confirm payment status at this time.');
        }
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [params.tx_ref, params.trx_ref]);

  // 1. Rendering Verification in progress
  if (verificationState === 'CONFIRMING') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Payment Verification" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.confirmingTitle}>Payment is being confirmed...</Text>
          <Text style={styles.confirmingSubtitle}>
            Please wait while we verify your transaction securely with Chapa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Rendering SUCCESS Confirmation
  if (verificationState === 'SUCCESS' && confirmedPayment) {
    const rawAmount = parseFloat(confirmedPayment.amount || '0');
    const displayAmount = rawAmount > 0 ? formatPrice(rawAmount) : `${confirmedPayment.amount} ETB`;
    const orderNum = confirmedPayment.orderNumber || 'Pending';

    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Payment Confirmed" />
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-sharp" size={48} color="#FFFFFF" />
          </View>

          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Your payment for Order #{orderNum} has been authoritatively verified and confirmed by Ardab Market.
          </Text>

          <View style={styles.summaryCard}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Order Number</Text>
              <Text style={styles.rowValueBold}>#{orderNum}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Amount Paid</Text>
              <Text style={[styles.rowValueBold, { color: Colors.primary }]}>
                {displayAmount}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Currency</Text>
              <Text style={styles.rowValue}>
                {confirmedPayment.currency || 'ETB'} (Ethiopian Birr)
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Payment Provider</Text>
              <Text style={styles.rowValue}>{confirmedPayment.provider || 'CHAPA'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Status</Text>
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeSuccessText}>CONFIRMED</Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonStack}>
            <AppButton
              title="View Order Details"
              variant="primary"
              size="lg"
              onPress={() => router.replace(`/orders/${confirmedPayment.orderId}` as any)}
            />
            <View style={{ height: Spacing.md }} />
            <AppButton
              title="Continue Shopping"
              variant="outline"
              size="lg"
              onPress={() => router.replace('/(tabs)' as any)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 3. Rendering FAILED Confirmation
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Payment Notice" />
      <ScrollView contentContainerStyle={styles.resultContainer}>
        <View style={styles.failureIconCircle}>
          <Ionicons name="close-sharp" size={48} color="#FFFFFF" />
        </View>

        <Text style={styles.failureTitle}>Payment Incomplete</Text>
        <Text style={styles.failureSubtitle}>
          {errorMessage || 'Your payment could not be confirmed. If funds were deducted, they will automatically reconcile.'}
        </Text>

        <View style={styles.buttonStack}>
          <AppButton
            title="Return to Orders"
            variant="primary"
            size="lg"
            onPress={() => router.replace('/(tabs)/orders' as any)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  confirmingTitle: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  confirmingSubtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  resultContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  successTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
    maxWidth: 320,
  },
  failureIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  failureTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  failureSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
    maxWidth: 320,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  rowValueBold: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: '700',
  },
  badgeSuccess: {
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.round,
  },
  badgeSuccessText: {
    color: Colors.success,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  buttonStack: {
    width: '100%',
    marginTop: Spacing.md,
  },
});

