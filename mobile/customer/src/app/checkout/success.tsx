import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppButton } from '@/components/common';
import { t } from '@/utils/i18n';

export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = (params.orderId as string) || '';
  const orderNumber = (params.orderNumber as string) || 'ARD-2026-9042';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {/* Animated Checkmark Circle */}
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark" size={54} color={Colors.textInverse} />
        </View>

        <Text style={styles.title}>{t('checkout.orderSuccessTitle')}</Text>
        <Text style={styles.subtitle}>{t('checkout.orderSuccessSub')}</Text>

        {/* Order Details Card */}
        <View style={styles.orderCard}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('orders.orderNumber')}</Text>
            <Text style={styles.cardValue}>{orderNumber}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('orders.deliveryEstimate')}</Text>
            <Text style={styles.cardValue}>24 - 48 {t('common.items')}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('orders.orderDate')}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{t('orders.statusConfirmed')}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <AppButton
            title={t('checkout.viewOrder')}
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
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.md,
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
    maxWidth: 300,
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
  statusPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
});
