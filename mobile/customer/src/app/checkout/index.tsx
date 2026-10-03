import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { useAuth } from '@/context/AuthContext';
import { formatPrice, t } from '@/utils/i18n';
import { AppHeader, AppButton, Divider } from '@/components/common';
import { orderService } from '@/services/orderService';
import { Address } from '@/types';

export default function CheckoutScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { cartItems, cartSubtotal, cartTotal, addresses, removeFromCart, language } = useApp();

  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<'CASH_ON_DELIVERY' | 'ONLINE'>('ONLINE');
  const [isPlacing, setIsPlacing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const fallbackAddress: Address = {
    id: 'default-addr',
    fullName: auth.user?.fullName || 'Ardab Customer',
    phone: auth.user?.phone || '+251911223344',
    city: 'Addis Ababa',
    subcity: 'Bole',
    woreda: 'Woreda 03',
    specificAddress: 'Bole Road, House #123',
    isDefault: true,
  };

  const selectedAddress = addresses[selectedAddressIndex] || addresses[0] || fallbackAddress;
  const selectedCartItems = cartItems.filter((i) => i.selected);

  const paymentOptions = [
    {
      key: 'ONLINE' as const,
      title: 'Online Payment',
      subtitle: 'Secure online payment through Chapa.',
      hint: 'Telebirr, CBE Birr, or Bank Card via Chapa checkout.',
      icon: 'card-outline',
    },
    {
      key: 'CASH_ON_DELIVERY' as const,
      title: 'Cash on Delivery',
      subtitle: 'Pay when your order is delivered.',
      hint: 'Pay cash to the delivery representative upon arrival.',
      icon: 'cash-outline',
    },
  ];

  const handlePlaceOrder = async () => {
    setCheckoutError(null);

    // 1. Enforce Authentication
    if (!auth.isAuthenticated) {
      setCheckoutError('Please sign in or create an account to proceed to secure payment.');
      router.push('/(auth)/login?redirect=/checkout' as any);
      return;
    }

    // 2. Validate Cart
    if (selectedCartItems.length === 0) {
      setCheckoutError('Please select items in your cart to checkout.');
      return;
    }

    setIsPlacing(true);

    try {
      const orderPayload = {
        items: selectedCartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        deliveryAddress: {
          recipientName: selectedAddress.fullName,
          phone: selectedAddress.phone,
          city: selectedAddress.city,
          deliveryZone: selectedAddress.subcity || undefined,
          neighborhood: selectedAddress.woreda || undefined,
          addressLine: selectedAddress.specificAddress || 'Addis Ababa',
        },
        paymentMethod: selectedPayment,
      };

      const liveOrder = await orderService.checkoutOrder(orderPayload);
      selectedCartItems.forEach((item) => removeFromCart(item.product.id));
      setIsPlacing(false);

      if (selectedPayment === 'CASH_ON_DELIVERY') {
        const orderAmount = liveOrder.totalEtb || (liveOrder.totalAmount ? parseFloat(String(liveOrder.totalAmount)) : cartTotal);
        router.replace(
          `/checkout/success?orderId=${liveOrder.id}&orderNumber=${liveOrder.orderNumber}&paymentMethod=CASH_ON_DELIVERY&amount=${orderAmount}` as any
        );
      } else {
        router.replace(
          `/checkout/payment?orderId=${liveOrder.id}&orderNumber=${liveOrder.orderNumber}&paymentId=${liveOrder.payment?.paymentId || ''}` as any
        );
      }
    } catch (err: any) {
      setIsPlacing(false);
      const errMsg = err.message || 'Unable to place order with backend. Please try again.';
      console.error('[CheckoutScreen] Checkout error:', errMsg);

      if (
        errMsg.toLowerCase().includes('authentication') ||
        errMsg.toLowerCase().includes('token') ||
        errMsg.toLowerCase().includes('unauthorized')
      ) {
        setCheckoutError('Authentication required. Redirecting to login...');
        router.push('/(auth)/login?redirect=/checkout' as any);
      } else {
        setCheckoutError(errMsg);
      }
    }
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

          {/* Dynamic Payment Method Guidance Box */}
          <View
            style={[
              styles.paymentNoticeBox,
              selectedPayment === 'ONLINE' ? styles.onlineNoticeBox : styles.codNoticeBox,
            ]}>
            <Ionicons
              name={selectedPayment === 'ONLINE' ? 'shield-checkmark' : 'information-circle'}
              size={18}
              color={selectedPayment === 'ONLINE' ? Colors.primary : Colors.primaryDark}
            />
            <Text
              style={[
                styles.paymentNoticeText,
                selectedPayment === 'ONLINE' ? styles.onlineNoticeText : styles.codNoticeText,
              ]}>
              {selectedPayment === 'ONLINE'
                ? 'Secure payment powered by Chapa. After placing your order, you will be redirected to complete payment with Telebirr, CBE Birr, or Card.'
                : 'Pay when your order arrives. You will pay the delivery representative directly in cash.'}
            </Text>
          </View>
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

        {/* Dynamic Error Feedback Banner */}
        {checkoutError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorBannerText}>{checkoutError}</Text>
          </View>
        ) : null}

        {/* Dynamic Place Order / Continue to Payment Action */}
        <AppButton
          title={
            selectedPayment === 'ONLINE'
              ? `Continue to Secure Payment • ${formatPrice(cartTotal)}`
              : `Place Order • ${formatPrice(cartTotal)}`
          }
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
  paymentNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
  },
  codNoticeBox: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  onlineNoticeBox: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  paymentNoticeText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
  codNoticeText: {
    color: Colors.textSecondary,
  },
  onlineNoticeText: {
    color: Colors.primaryDark,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: '#991B1B',
    fontWeight: Typography.fontWeight.medium,
  },
});
