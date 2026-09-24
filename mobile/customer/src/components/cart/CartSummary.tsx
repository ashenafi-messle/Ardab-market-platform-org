import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { t, formatPrice } from '@/utils/i18n';
import { AppButton } from '../common/AppButton';

export interface CartSummaryProps {
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  total: number;
  onCheckout: () => void;
  disabled?: boolean;
  itemCount?: number;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  subtotal,
  deliveryFee,
  discount = 0,
  total,
  onCheckout,
  disabled = false,
  itemCount = 0,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{t('cart.subtotal')}</Text>
        <Text style={styles.value}>{formatPrice(subtotal)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t('cart.deliveryFee')}</Text>
        <Text style={styles.value}>
          {deliveryFee > 0 ? formatPrice(deliveryFee) : t('common.free')}
        </Text>
      </View>

      {discount > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.label, styles.discountText]}>{t('cart.discount')}</Text>
          <Text style={[styles.value, styles.discountText]}>-{formatPrice(discount)}</Text>
        </View>
      ) : null}

      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>{t('cart.total')}</Text>
        <Text style={styles.totalValue}>{formatPrice(total)}</Text>
      </View>

      <AppButton
        title={`${t('cart.checkout')} (${itemCount})`}
        onPress={onCheckout}
        disabled={disabled}
        size="lg"
        style={styles.checkoutBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    ...Shadows.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  discountText: {
    color: Colors.error,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  totalLabel: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  totalValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
  checkoutBtn: {
    marginTop: Spacing.xs,
  },
});
