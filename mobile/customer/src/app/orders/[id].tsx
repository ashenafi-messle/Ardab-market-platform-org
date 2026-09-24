import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { formatPrice, t } from '@/localization';
import { AppHeader, AppButton, Divider } from '@/components/common';
import { OrderStatus, OrderTimeline } from '@/components/order';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, language } = useApp();

  const order = orders.find((o) => o.id === id) || orders[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={`${t('orders.orderId')} #${order.orderNumber}`} showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Top Status & Date Banner */}
        <View style={styles.statusBanner}>
          <View>
            <Text style={styles.dateLabel}>{t('orders.orderDate')}</Text>
            <Text style={styles.dateValue}>
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <OrderStatus status={order.status} />
        </View>

        {/* Tracking Preview Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('orders.orderTimeline')}</Text>
            <TouchableOpacity
              onPress={() => router.push(`/orders/tracking?id=${order.id}` as any)}>
              <Text style={styles.viewMapText}>{t('orders.trackOrder')}</Text>
            </TouchableOpacity>
          </View>

          <OrderTimeline steps={order.trackingSteps} />
        </View>

        {/* Ordered Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('common.items')} ({order.items.length})</Text>

          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Image
                source={{ uri: item.product.images[0] }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <View style={styles.itemMetaRow}>
                  <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                  <Text style={styles.itemQuantity}>{t('product.quantity')}: {item.quantity}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <View style={styles.sectionCard}>
          <View style={styles.cardTitleWithIcon}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
          </View>
          <Text style={styles.addressName}>{order.shippingAddress.fullName}</Text>
          <Text style={styles.addressPhone}>{order.shippingAddress.phone}</Text>
          <Text style={styles.addressDetails}>
            {order.shippingAddress.specificAddress},{' '}
            {order.shippingAddress.subcity ? `${order.shippingAddress.subcity}, ` : ''}
            {order.shippingAddress.city}
          </Text>
        </View>

        {/* Payment Summary */}
        <View style={styles.sectionCard}>
          <View style={styles.cardTitleWithIcon}>
            <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t('checkout.paymentMethod')}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('checkout.paymentMethod')}</Text>
            <Text style={styles.infoValue}>{order.paymentMethod}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('common.verified')}</Text>
            <View
              style={[
                styles.payStatusBadge,
                order.paymentStatus === 'PAID' ? styles.payPaid : styles.payPending,
              ]}>
              <Text
                style={[
                  styles.payStatusText,
                  order.paymentStatus === 'PAID' ? styles.payPaidText : styles.payPendingText,
                ]}>
                {order.paymentStatus}
              </Text>
            </View>
          </View>

          <Divider spacing="sm" />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('cart.subtotal')}</Text>
            <Text style={styles.infoValue}>{formatPrice(order.subtotal)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('cart.deliveryFee')}</Text>
            <Text style={styles.infoValue}>{formatPrice(order.deliveryFee)}</Text>
          </View>

          {order.discount > 0 ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: Colors.error }]}>{t('cart.discount')}</Text>
              <Text style={[styles.infoValue, { color: Colors.error }]}>
                -{formatPrice(order.discount)}
              </Text>
            </View>
          ) : null}

          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>
        </View>

        {/* Action Button */}
        <AppButton
          title={t('orders.trackOrder')}
          variant="primary"
          size="lg"
          onPress={() => router.push(`/orders/tracking?id=${order.id}` as any)}
          style={{ marginBottom: Spacing.md }}
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
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  dateLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  dateValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginTop: 2,
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
    marginBottom: Spacing.xs,
  },
  cardTitleWithIcon: {
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
  viewMapText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  itemDetails: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  itemQuantity: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  addressName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  addressPhone: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginVertical: 2,
  },
  addressDetails: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  payStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  payPaid: {
    backgroundColor: Colors.successLight,
  },
  payStatusText: {
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
  },
  payPaidText: {
    color: Colors.success,
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
  },
  payPending: {
    backgroundColor: Colors.warningLight,
  },
  payPendingText: {
    color: Colors.warning,
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
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
});
