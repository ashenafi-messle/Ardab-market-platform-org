// ==============================================================================
// Ardab Market - Production Customer Mobile Payment Screen (Chapa Gateway)
// ==============================================================================
// Enterprise Escrow Checkout Screen for Ethiopian Birr transactions.
// Features:
// - Authoritative server-side price enforcement
// - Single-tap protection with immediate button disable
// - Chapa hosted checkout via WebBrowser session with deep link return
// - Controlled status polling recovery (2s interval, max 5 attempts)
// - No secrets on client; handles app backgrounding and crash recovery
// ==============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader, AppButton, Divider } from '@/components/common';
import { orderService } from '@/services/orderService';
import { paymentService, PaymentStatusResponse } from '@/services/paymentService';
import { formatPrice } from '@/localization';

// Complete session handling for web/browser
WebBrowser.maybeCompleteAuthSession();

const RECOVERY_STORAGE_KEY = '@ardab_pending_payment';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId?: string;
    orderNumber?: string;
    paymentId?: string;
    status?: string;
  }>();

  const [orderId, setOrderId] = useState<string | null>(params.orderId || null);
  const [order, setOrder] = useState<any | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isPollingStatus, setIsPollingStatus] = useState<boolean>(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(params.paymentId || null);
  const [confirmedPayment, setConfirmedPayment] = useState<PaymentStatusResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  >('IDLE');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);
  const pollAttemptsRef = useRef<number>(0);

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // 1. Load authoritative order details
  const fetchOrder = useCallback(async (idToLoad: string) => {
    setIsLoadingOrder(true);
    try {
      const res = await orderService.getOrderById(idToLoad);
      const loadedOrder = res.order;
      setOrder(loadedOrder);

      // Only mark SUCCESS if confirmed by backend database and NOT a local mock order
      if (loadedOrder.paymentStatus === 'PAID' && !idToLoad.startsWith('ord-')) {
        setPaymentStatus('SUCCESS');
      }
    } catch (err: any) {
      console.warn('[PaymentScreen] Failed to load order details:', err.message);
      Alert.alert('Notice', 'Unable to retrieve the latest order summary. Please check your network.');
    } finally {
      setIsLoadingOrder(false);
    }
  }, []);

  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId);
    } else {
      // Check local storage for interrupted payment recovery
      AsyncStorage.getItem(RECOVERY_STORAGE_KEY).then((saved) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.orderId) {
              setOrderId(parsed.orderId);
              setActivePaymentId(parsed.paymentId || null);
              fetchOrder(parsed.orderId);
            }
          } catch {}
        } else {
          setIsLoadingOrder(false);
        }
      });
    }
  }, [orderId, fetchOrder]);

  // 2. Poll payment status from backend with controlled retry limits and backoff (2s, 4s, 6s, 8s, 10s)
  const startStatusPolling = useCallback(
    (paymentIdToPoll: string) => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      pollAttemptsRef.current = 0;
      setIsPollingStatus(true);
      setPaymentStatus('PROCESSING');
      setStatusMessage('Confirming your payment with Chapa...');

      const backoffDelays = [2000, 4000, 6000, 8000, 10000];

      const poll = async () => {
        try {
          const statusRes: PaymentStatusResponse = await paymentService.getPaymentStatus(
            paymentIdToPoll
          );

          if (statusRes.status === 'SUCCESS' || statusRes.isSuccess) {
            setConfirmedPayment(statusRes);
            setPaymentStatus('SUCCESS');
            setIsPollingStatus(false);
            setStatusMessage('Payment verified successfully!');
            await AsyncStorage.removeItem(RECOVERY_STORAGE_KEY);
            return;
          }

          if (statusRes.status === 'FAILED') {
            setPaymentStatus('FAILED');
            setIsPollingStatus(false);
            setStatusMessage(statusRes.failureReason || 'Payment was not completed. Please try again.');
            await AsyncStorage.removeItem(RECOVERY_STORAGE_KEY);
            return;
          }

          if (statusRes.status === 'CANCELLED') {
            setPaymentStatus('CANCELLED');
            setIsPollingStatus(false);
            setStatusMessage('Payment was cancelled.');
            await AsyncStorage.removeItem(RECOVERY_STORAGE_KEY);
            return;
          }

          if (statusRes.status === 'EXPIRED') {
            setPaymentStatus('FAILED');
            setIsPollingStatus(false);
            setStatusMessage('Payment session expired. Please try again.');
            await AsyncStorage.removeItem(RECOVERY_STORAGE_KEY);
            return;
          }

          // Controlled backoff: 2s, 4s, 6s, 8s, 10s
          if (pollAttemptsRef.current < backoffDelays.length) {
            const nextDelay = backoffDelays[pollAttemptsRef.current];
            pollAttemptsRef.current += 1;
            pollTimerRef.current = setTimeout(poll, nextDelay);
          } else {
            setIsPollingStatus(false);
            setStatusMessage(
              'Payment is being confirmed. Please don\'t make another payment.'
            );
          }
        } catch (err: any) {
          console.warn('[PaymentScreen] Error polling payment status:', err.message);
          setIsPollingStatus(false);
          setStatusMessage('Could not verify status right now. You can check order history.');
        }
      };

      poll();
    },
    []
  );

  // 3. Initiate payment with Chapa Hosted Checkout
  const handlePayWithChapa = async () => {
    if (!orderId || isInitializing || isPollingStatus) return;

    setIsInitializing(true);
    setStatusMessage(null);

    try {
      // Build deep link callback URL for Chapa redirect
      const deepLinkUrl = Linking.createURL('payment/chapa/callback');

      const initResult = await paymentService.initializePayment(orderId, deepLinkUrl);

      if (initResult.status === 'SUCCESS') {
        setPaymentStatus('SUCCESS');
        setIsInitializing(false);
        return;
      }

      if (!initResult.checkoutUrl) {
        throw new Error('Chapa checkout URL was not returned.');
      }

      setActivePaymentId(initResult.paymentId);

      // Save to local storage for recovery in case of app backgrounding/crash
      await AsyncStorage.setItem(
        RECOVERY_STORAGE_KEY,
        JSON.stringify({
          orderId,
          paymentId: initResult.paymentId,
          txRef: initResult.txRef,
          timestamp: Date.now(),
        })
      );

      // Open hosted checkout modal in browser
      const browserResult = await WebBrowser.openAuthSessionAsync(
        initResult.checkoutUrl,
        deepLinkUrl
      );

      setIsInitializing(false);

      // When browser completes or returns, authoritatively poll backend status
      startStatusPolling(initResult.paymentId);
    } catch (err: any) {
      setIsInitializing(false);
      console.error('[PaymentScreen] Payment initialization error:', err.message);
      Alert.alert(
        'Payment Initialization Failed',
        err.message || 'Unable to connect to payment provider. Please try again in a few moments.'
      );
    }
  };

  if (isLoadingOrder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Order Payment" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Retrieving authoritative order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const orderNum = confirmedPayment?.orderNumber || order?.orderNumber || params.orderNumber || 'Pending';
  const totalAmount = order?.totalAmount != null
    ? (typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount))
    : (order?.totalEtb ?? (order?.total != null ? (typeof order.total === 'number' ? order.total : parseFloat(order.total)) : 0));
  const confirmedAmount = confirmedPayment?.amount != null
    ? parseFloat(confirmedPayment.amount)
    : (totalAmount > 0 ? totalAmount : null);
  const currency = confirmedPayment?.currency || order?.currency || 'ETB';
  const provider = confirmedPayment?.provider || 'CHAPA';

  const subtotal = order?.subtotal ?? order?.subtotalEtb ?? 0;
  const deliveryFee = order?.deliveryFee ?? order?.deliveryFeeEtb ?? 0;
  const discount = order?.discountAmount ?? order?.discountEtb ?? 0;

  // Render SUCCESS result screen
  if (paymentStatus === 'SUCCESS') {
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
                {confirmedAmount != null && confirmedAmount > 0
                  ? formatPrice(confirmedAmount)
                  : 'Verifying amount...'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Currency</Text>
              <Text style={styles.rowValue}>{currency} (Ethiopian Birr)</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Payment Provider</Text>
              <Text style={styles.rowValue}>{provider}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Status</Text>
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeSuccessText}>CONFIRMED</Text>
              </View>
            </View>
          </View>

          <AppButton
            title="View Order Details"
            variant="primary"
            size="lg"
            onPress={() => router.replace(`/orders/${orderId || order?.id}` as any)}
            style={{ width: '100%', marginBottom: Spacing.md }}
          />

          <AppButton
            title="Continue Shopping"
            variant="outline"
            size="lg"
            onPress={() => router.replace('/' as any)}
            style={{ width: '100%' }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Order Payment" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Security Reassurance Header */}
        <View style={styles.securityBanner}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Ardab Verified Escrow Protection</Text>
            <Text style={styles.securityDesc}>
              Payments are processed via 256-bit encrypted Chapa gateway and held securely until delivery.
            </Text>
          </View>
        </View>

        {/* Order Identification Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.orderNumberLabel}>ORDER NUMBER</Text>
              <Text style={styles.orderNumberValue}>#{orderNum}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                paymentStatus === 'PROCESSING'
                  ? styles.statusBadgeProcessing
                  : paymentStatus === 'FAILED'
                  ? styles.statusBadgeFailed
                  : styles.statusBadgePending,
              ]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  paymentStatus === 'PROCESSING'
                    ? styles.statusTextProcessing
                    : paymentStatus === 'FAILED'
                    ? styles.statusTextFailed
                    : styles.statusTextPending,
                ]}>
                {paymentStatus === 'PROCESSING'
                  ? 'PROCESSING'
                  : paymentStatus === 'FAILED'
                  ? 'FAILED'
                  : 'PAYMENT PENDING'}
              </Text>
            </View>
          </View>

          <Divider style={{ marginVertical: Spacing.md }} />

          {/* Authoritative Financial Breakdown */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Subtotal</Text>
            <Text style={styles.rowValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Delivery Fee</Text>
            <Text style={styles.rowValue}>{formatPrice(deliveryFee)}</Text>
          </View>
          {Number(discount) > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Discount</Text>
              <Text style={[styles.rowValue, { color: '#059669' }]}>
                -{formatPrice(discount)}
              </Text>
            </View>
          )}

          <Divider style={{ marginVertical: Spacing.md }} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total Payable (ETB)</Text>
            <Text style={styles.totalValue}>{formatPrice(totalAmount)}</Text>
          </View>
        </View>

        {/* Status / Notice Messages */}
        {statusMessage ? (
          <View
            style={[
              styles.noticeBox,
              paymentStatus === 'FAILED' ? styles.noticeBoxFailed : styles.noticeBoxInfo,
            ]}>
            {isPollingStatus && (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={{ marginRight: Spacing.sm }}
              />
            )}
            <Text
              style={[
                styles.noticeText,
                paymentStatus === 'FAILED' ? styles.noticeTextFailed : styles.noticeTextInfo,
              ]}>
              {statusMessage}
            </Text>
          </View>
        ) : null}

        {/* Payment Methods Supported */}
        <View style={styles.supportedChannelsRow}>
          <Text style={styles.supportedChannelsLabel}>Accepted via Chapa:</Text>
          <View style={styles.channelsPills}>
            <Text style={styles.pillText}>Telebirr</Text>
            <Text style={styles.pillText}>CBE Birr</Text>
            <Text style={styles.pillText}>Commercial Bank</Text>
            <Text style={styles.pillText}>Visa / Mastercard</Text>
          </View>
        </View>

        {/* Action Button: Pay with Chapa */}
        <View style={styles.actionContainer}>
          <AppButton
            title={
              isInitializing
                ? 'Connecting to Chapa...'
                : isPollingStatus
                ? 'Verifying Payment...'
                : `Pay ${formatPrice(totalAmount)} with Chapa`
            }
            variant="primary"
            size="lg"
            loading={isInitializing || isPollingStatus}
            disabled={isInitializing || isPollingStatus}
            onPress={handlePayWithChapa}
            style={styles.payButton}
          />

          {paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED' ? (
            <TouchableOpacity
              onPress={() => router.replace(`/orders/${orderId || order?.id}` as any)}
              style={styles.secondaryActionBtn}>
              <Text style={styles.secondaryActionText}>Return to Order Details</Text>
            </TouchableOpacity>
          ) : null}
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
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  content: {
    padding: Spacing.lg,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  securityTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: '#1E40AF',
  },
  securityDesc: {
    fontSize: Typography.fontSize.xs,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
    marginBottom: Spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumberLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.5,
  },
  orderNumberValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeProcessing: {
    backgroundColor: '#DBEAFE',
  },
  statusBadgeFailed: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextProcessing: {
    color: '#1E40AF',
  },
  statusTextFailed: {
    color: '#991B1B',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  rowLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
  rowValueBold: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  totalLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  totalValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  noticeBoxInfo: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  noticeBoxFailed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  noticeText: {
    fontSize: Typography.fontSize.sm,
    flex: 1,
  },
  noticeTextInfo: {
    color: '#0369A1',
  },
  noticeTextFailed: {
    color: '#B91C1C',
  },
  supportedChannelsRow: {
    marginBottom: Spacing.xl,
  },
  supportedChannelsLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  channelsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pillText: {
    fontSize: 11,
    color: Colors.textSecondary,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  actionContainer: {
    marginTop: Spacing.sm,
  },
  payButton: {
    width: '100%',
  },
  secondaryActionBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  secondaryActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  resultContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  successTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  successSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeSuccessText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
});
