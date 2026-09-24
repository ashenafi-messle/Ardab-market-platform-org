import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { formatPrice, t } from '@/utils/i18n';
import { AppHeader, AppButton, Divider } from '@/components/common';

export default function CheckoutScreen() {
  const router = useRouter();
  const { cartItems, cartSubtotal, cartTotal, addresses, placeOrder, language } = useApp();

  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<'COD' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK'>('COD');
  const [isPlacing, setIsPlacing] = useState(false);

  const selectedAddress = addresses[selectedAddressIndex] || addresses[0];
  const selectedCartItems = cartItems.filter((i) => i.selected);

  const paymentOptions = [
    {
      key: 'COD',
      title: t('checkout.cashOnDelivery'),
      subtitle: t('checkout.cashOnDeliveryDesc'),
      icon: 'cash-outline',
    },
    {
      key: 'TELEBIRR',
      title: t('checkout.telebirr'),
      subtitle: t('checkout.telebirrDesc'),
      icon: 'phone-portrait-outline',
    },
    {
      key: 'CBE_BIRR',
      title: t('checkout.cbeBirr'),
      subtitle: t('checkout.cbeBirrDesc'),
      icon: 'card-outline',
    },
    {
      key: 'BANK',
      title: t('checkout.bankTransfer'),
      subtitle: t('checkout.bankTransferDesc'),
      icon: 'business-outline',
    },
  ];

  const handlePlaceOrder = () => {
    setIsPlacing(true);
    const paymentName =
      paymentOptions.find((p) => p.key === selectedPayment)?.title || 'Cash on Delivery';

    setTimeout(() => {
      setIsPlacing(false);
      const newOrder = placeOrder(paymentName, selectedAddress);
      router.replace(`/checkout/success?orderId=${newOrder.id}&orderNumber=${newOrder.orderNumber}` as any);
    }, 900);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('checkout.title')} showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* 1. Delivery Address Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons name="location-outline" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/checkout/address' as any)}>
              <Text style={styles.changeActionText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>

          {selectedAddress ? (
            <View style={styles.addressBox}>
              <View style={styles.addressNameRow}>
                <Text style={styles.recipientName}>{selectedAddress.fullName}</Text>
                <Text style={styles.recipientPhone}>{selectedAddress.phone}</Text>
              </View>
              <Text style={styles.addressText}>
                {selectedAddress.specificAddress}, {selectedAddress.subcity || ''},{' '}
                {selectedAddress.city}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/checkout/address' as any)}
              style={styles.addAddressBox}>
              <Text style={styles.addAddressText}>{t('checkout.addNewAddress')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Order Items Preview */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('common.items')} ({selectedCartItems.length})</Text>
          {selectedCartItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemQty}>{item.quantity}x</Text>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.product.name}
                </Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatPrice(item.product.price * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* 3. Payment Method */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleWithIcon}>
            <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t('checkout.paymentMethod')}</Text>
          </View>

          {paymentOptions.map((opt) => {
            const isSelected = selectedPayment === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.8}
                onPress={() => setSelectedPayment(opt.key as any)}
                style={[styles.paymentOption, isSelected && styles.paymentOptionSelected]}>
                <View style={styles.paymentLeft}>
                  <View
                    style={[
                      styles.paymentIconWrapper,
                      isSelected && styles.paymentIconWrapperSelected,
                    ]}>
                    <Ionicons
                      name={opt.icon as any}
                      size={20}
                      color={isSelected ? Colors.primaryDark : Colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentTitle, isSelected && styles.paymentTitleSelected]}>
                      {opt.title}
                    </Text>
                    <Text style={styles.paymentSubtitle}>{opt.subtitle}</Text>
                  </View>
                </View>

                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? Colors.primary : Colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. Cost Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('checkout.orderSummary')}</Text>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>{t('cart.subtotal')}</Text>
            <Text style={styles.costValue}>{formatPrice(cartSubtotal)}</Text>
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>{t('cart.deliveryFee')}</Text>
            <Text style={styles.costValue}>{formatPrice(150)}</Text>
          </View>

          <Divider spacing="sm" />

          <View style={[styles.costRow, styles.costTotalRow]}>
            <Text style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text style={styles.totalValue}>{formatPrice(cartTotal)}</Text>
          </View>
        </View>

        {/* Place Order Action */}
        <AppButton
          title={`${t('checkout.placeOrder')} • ${formatPrice(cartTotal)}`}
          onPress={handlePlaceOrder}
          loading={isPlacing}
          size="lg"
          style={styles.placeOrderBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  changeActionText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  addressBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  addressNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  recipientPhone: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  addressText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  addAddressBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  addAddressText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  itemQty: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  itemName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    flex: 1,
  },
  itemPrice: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    marginRight: Spacing.sm,
  },
  paymentIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconWrapperSelected: {
    backgroundColor: Colors.background,
  },
  paymentTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  paymentTitleSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  paymentSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  costLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  costValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  costTotalRow: {
    paddingTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  totalValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
  placeOrderBtn: {
    marginTop: Spacing.sm,
  },
});
