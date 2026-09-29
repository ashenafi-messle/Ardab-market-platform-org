import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { formatPrice } from '@/localization';
import { AppHeader, AppButton, Divider } from '@/components/common';
import { OrderStatus, OrderTimeline } from '@/components/order';
import { CustomerOrder } from '@/types';
import { orderService } from '@/services/orderService';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadOrderDetails = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await orderService.getOrderById(id);
      setOrder(res.order);
      setIsOffline(!!res.isOffline);
    } catch (err: any) {
      console.warn('[OrderDetailsScreen] Failed to load order:', err);
      setErrorMsg(err.message || 'Unable to load order details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

  // Handle Order Cancellation by Customer
  const handleCancelOrder = () => {
    if (!order) return;

    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order #${order.orderNumber}? This action cannot be reversed.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              const res = await orderService.cancelOrder(order.id, 'Cancelled by customer from mobile app');
              Alert.alert('Order Cancelled', res.message || 'Your order has been cancelled.');
              loadOrderDetails(true);
            } catch (err: any) {
              Alert.alert('Cancellation Error', err.message || 'Unable to cancel this order.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  // Contact Ardab Market Support with Order Reference
  const handleContactSupport = () => {
    if (order?.orderNumber) {
      orderService.contactSupport(order.orderNumber);
    } else {
      orderService.contactSupport();
    }
  };

  if (isLoading && !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Order Details" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg && !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Order Details" showBack />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Order Unavailable</Text>
          <Text style={styles.errorSub}>{errorMsg}</Text>
          <AppButton
            title="Try Again"
            variant="outline"
            size="md"
            onPress={() => loadOrderDetails()}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const isActive = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY_FOR_DELIVERY',
    'ASSIGNED_TO_TRIP',
    'PICKED_UP',
    'IN_TRANSIT',
    'SHIPPING',
  ].includes(order.status);

  const canCancel = order.canCancel ?? ['PENDING', 'CONFIRMED'].includes(order.status);

  // Address resolution
  const recipientName =
    order.deliveryAddressSnapshot?.recipientName ||
    order.recipientName ||
    order.shippingAddress?.fullName ||
    'Customer';

  const recipientPhone =
    order.deliveryAddressSnapshot?.phone ||
    order.recipientPhone ||
    order.shippingAddress?.phone ||
    '';

  const fullAddress =
    order.deliveryAddressSnapshot?.addressLine ||
    order.deliveryAddress ||
    order.shippingAddress?.specificAddress ||
    '';

  const cityZone = [
    order.deliveryAddressSnapshot?.neighborhood,
    order.deliveryAddressSnapshot?.deliveryZone || order.deliveryZone,
    order.deliveryAddressSnapshot?.city || order.city,
  ]
    .filter(Boolean)
    .join(', ');

  // Totals resolution
  const subtotal = order.subtotalEtb ?? Number(order.subtotal || 0);
  const deliveryFee = order.deliveryFeeEtb ?? Number(order.deliveryFee || 0);
  const discount = order.discountEtb ?? Number(order.discountAmount || order.discount || 0);
  const total = order.totalEtb ?? Number(order.totalAmount || order.total || 0);

  const orderDate = new Date(order.placedAt || order.createdAt || Date.now());

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={`Order #${order.orderNumber}`} showBack />

      {/* Offline banner */}
      {isOffline ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#B45309" />
          <Text style={styles.offlineText}>Offline mode • Showing saved order details</Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadOrderDetails(true)}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }>
        {/* Top Status & Date Banner */}
        <View style={styles.statusBanner}>
          <View>
            <Text style={styles.dateLabel}>Order Placed</Text>
            <Text style={styles.dateValue}>
              {orderDate.toLocaleDateString('en-US', {
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
            <View style={styles.cardTitleWithIcon}>
              <Ionicons name="navigate-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Order Tracking</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/orders/tracking?id=${order.id}` as any)}>
              <Text style={styles.viewMapText}>View Full Timeline ›</Text>
            </TouchableOpacity>
          </View>

          <OrderTimeline
            milestones={order.milestones}
            steps={order.trackingSteps}
          />
        </View>

        {/* Ordered Items */}
        <View style={styles.sectionCard}>
          <View style={styles.cardTitleWithIcon}>
            <Ionicons name="basket-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Items ({order.items?.length || 0})</Text>
          </View>

          {order.items?.map((item, index) => {
            const imgUri = item.productImage || item.product?.images?.[0];
            const name = item.productName || item.product?.name || 'Product';
            const unitPrice = item.unitPriceEtb ?? Number(item.unitPrice || item.price || 0);

            return (
              <View key={item.id || index} style={styles.itemRow}>
                {imgUri ? (
                  <Image
                    source={{ uri: imgUri }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemImage, styles.placeholderImg]}>
                    <Ionicons name="cube-outline" size={24} color={Colors.textMuted} />
                  </View>
                )}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {name}
                  </Text>
                  {item.sellerName ? (
                    <Text style={styles.sellerName} numberOfLines={1}>
                      Sold by: {item.sellerName}
                    </Text>
                  ) : null}
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.itemPrice}>{formatPrice(unitPrice)}</Text>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Delivery Address */}
        <View style={styles.sectionCard}>
          <View style={styles.cardTitleWithIcon}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Information</Text>
          </View>
          <Text style={styles.addressName}>{recipientName}</Text>
          {recipientPhone ? <Text style={styles.addressPhone}>{recipientPhone}</Text> : null}
          <Text style={styles.addressDetails}>
            {fullAddress}
            {cityZone ? `, ${cityZone}` : ''}
          </Text>
        </View>

        {/* Payment Summary */}
        <View style={styles.sectionCard}>
          <View style={styles.cardTitleWithIcon}>
            <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Payment Summary</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method</Text>
            <Text style={styles.infoValue}>{order.paymentMethod || 'Cash on Delivery'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status</Text>
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
                {order.paymentStatus || 'PENDING'}
              </Text>
            </View>
          </View>

          <Divider spacing="sm" />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subtotal</Text>
            <Text style={styles.infoValue}>{formatPrice(subtotal)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Fee</Text>
            <Text style={styles.infoValue}>{formatPrice(deliveryFee)}</Text>
          </View>

          {discount > 0 ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: Colors.error }]}>Discount</Text>
              <Text style={[styles.infoValue, { color: Colors.error }]}>
                -{formatPrice(discount)}
              </Text>
            </View>
          ) : null}

          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        {/* Customer Support Card */}
        <View style={styles.supportCard}>
          <View style={styles.supportHeader}>
            <Ionicons name="headset" size={24} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.supportTitle}>Need Help with this Order?</Text>
              <Text style={styles.supportSub}>
                Order reference #{order.orderNumber} will be attached automatically.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleContactSupport}
            style={styles.supportBtn}>
            <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
            <Text style={styles.supportBtnText}>Contact Ardab Market Support</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons: Track Order & Cancel Order */}
        {isActive ? (
          <AppButton
            title="Track Live Order"
            variant="primary"
            size="lg"
            onPress={() => router.push(`/orders/tracking?id=${order.id}` as any)}
            style={{ marginBottom: Spacing.md }}
          />
        ) : null}

        {canCancel ? (
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isCancelling}
            onPress={handleCancelOrder}
            style={styles.cancelButton}>
            {isCancelling ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  errorTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  errorSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineText: {
    fontSize: Typography.fontSize.xs,
    color: '#92400E',
    fontWeight: Typography.fontWeight.medium,
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
    marginBottom: Spacing.sm,
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
    width: 54,
    height: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  placeholderImg: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  itemDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  itemName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  sellerName: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    marginTop: 1,
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
    marginTop: 2,
  },
  addressPhone: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addressDetails: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  payStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  payStatusText: {
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
  },
  payPaid: {
    backgroundColor: '#DCFCE7',
  },
  payPaidText: {
    color: '#15803D',
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
  },
  payPending: {
    backgroundColor: '#FEF3C7',
  },
  payPendingText: {
    color: '#B45309',
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
  },
  totalRow: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  totalLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  totalValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
  supportCard: {
    backgroundColor: Colors.primaryLight || '#EEF2FF',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  supportTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark || '#1E1B4B',
  },
  supportSub: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary || '#4F46E5',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  supportBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: '#FEF2F2',
    marginBottom: Spacing.lg,
  },
  cancelButtonText: {
    color: Colors.error,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
});
