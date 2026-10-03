import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppButton } from '@/components/common';
import { formatPrice, t } from '@/utils/i18n';

export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = (params.orderId as string) || '';
  const orderNumber = (params.orderNumber as string) || 'ARD-2026-9042';
  const paymentMethod = (params.paymentMethod as string) || 'CASH_ON_DELIVERY';
  const amount = Number(params.amount) || 0;

  const isCod = paymentMethod === 'CASH_ON_DELIVERY';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {/* Animated Checkmark Circle */}
        <View style={[styles.successIconCircle, isCod ? styles.codIconCircle : styles.onlineIconCircle]}>
          <Ionicons name="checkmark" size={54} color={Colors.textInverse} />
        </View>

        <Text style={styles.title}>
          {isCod ? '✓ Order Placed' : '✓ Payment Successful'}
        </Text>
        <Text style={styles.subtitle}>
          {isCod
            ? "Your order has been placed. You'll pay when your order is delivered to your door."
            : 'Your online payment was verified and confirmed by Ardab Market.'}
        </Text>

        {/* Order Details Card */}
        <View style={styles.orderCard}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('orders.orderNumber')}</Text>
            <Text style={styles.cardValue}>{orderNumber}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Payment Method</Text>
            <Text style={styles.cardValue}>
              {isCod ? 'Cash on Delivery' : 'Online Payment (Chapa)'}
            </Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Payment Status</Text>
            <View style={[styles.statusPill, isCod ? styles.statusPillCod : styles.statusPillPaid]}>
              <Text style={[styles.statusText, isCod ? styles.statusTextCod : styles.statusTextPaid]}>
                {isCod ? 'Pay on delivery' : 'Paid'}
              </Text>
            </View>
          </View>

          {amount > 0 ? (
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{isCod ? 'Amount Due' : 'Paid'}</Text>
              <Text style={styles.cardAmountValue}>{formatPrice(amount)}</Text>
            </View>
          ) : null}

          {isCod ? (
            <View style={styles.codNoteBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.codNoteText}>
                Please prepare exact cash for the delivery representative.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <AppButton
            title={isCod ? 'Track Order' : t('checkout.viewOrder')}
            variant="primary"
            size="lg"
            onPress={() => router.replace(`/orders/${orderId}` as any)}
            style={styles.actionBtn}
          />

          <AppButton
            title={t('checkout.continueShopping')}
            variant="outline"
            size="lg"
            onPress={() => router.replace('/(tabs)' as any)}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  codIconCircle: {
    backgroundColor: '#0D9488', // Teal for COD
  },
  onlineIconCircle: {
    backgroundColor: Colors.primary, // Brand Primary for Online
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xxl,
    maxWidth: 320,
    lineHeight: 20,
  },
  orderCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  cardValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  cardAmountValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusPillPaid: {
    backgroundColor: '#DCFCE7',
  },
  statusPillCod: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  statusTextPaid: {
    color: '#15803D',
  },
  statusTextCod: {
    color: '#B45309',
  },
  codNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#F9FAFB',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  codNoteText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
});
