import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader } from '@/components/common';
import { OrderTimeline, OrderStatus } from '@/components/order';
import { orderService, OrderTrackingResult } from '@/services/orderService';
import { useApp } from '@/store';

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders: storeOrders } = useApp();

  const [tracking, setTracking] = useState<OrderTrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  const loadTrackingData = useCallback(
    async (isBackground = false) => {
      if (!id) return;
      if (!isBackground) {
        if (!tracking) setIsLoading(true);
      }
      setErrorMsg(null);

      try {
        const res = await orderService.getOrderTimeline(id);
        setTracking(res);
        setIsOffline(!!res.isOffline);
        setLastUpdated(res.lastUpdated || new Date().toISOString());
      } catch (err: any) {
        console.warn('[OrderTrackingScreen] Error fetching tracking:', err);
        const local = storeOrders?.find((o) => o.id === id || o.orderNumber === id);
        if (local) {
          setTracking({
            orderId: local.id,
            orderNumber: local.orderNumber,
            status: local.status,
            paymentStatus: local.paymentStatus,
            isCancellable: false,
            milestones: local.milestones || [],
            timeline: local.timeline || [],
            delivery: local.delivery || null,
            deliveryAddress: local.deliveryAddressSnapshot || null,
            support: {
              telegramBotUrl: 'https://t.me/Ardab_market_bot',
              supportPhone: '+251911000000',
              supportEmail: 'support@ardabmarket.com',
              orderReference: local.orderNumber,
            },
            isOffline: true,
            lastUpdated: local.createdAt || null,
          });
          setIsOffline(true);
        } else if (!tracking) {
          setErrorMsg(err.message || 'Tracking information unavailable');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id, tracking, storeOrders]
  );

  // Initial load
  useEffect(() => {
    loadTrackingData(false);
  }, [id]);

  // Real-time polling for active orders every 20 seconds while screen is mounted
  useEffect(() => {
    if (!tracking) return;

    const isActive = ![
      'DELIVERED',
      'CANCELLED',
      'REJECTED',
      'FAILED',
      'RETURNED',
    ].includes(tracking.status);

    if (isActive) {
      pollTimerRef.current = setInterval(() => {
        loadTrackingData(true);
      }, 20000);
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [tracking?.status, loadTrackingData]);

  const handleCallCourier = () => {
    const phone = tracking?.delivery?.agentPhone || '+251911000000';
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const handleContactSupport = () => {
    orderService.contactSupport(tracking?.orderNumber);
  };

  if (isLoading && !tracking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Order Tracking" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading tracking timeline...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg && !tracking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Order Tracking" showBack />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Tracking Unavailable</Text>
          <Text style={styles.errorSub}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadTrackingData(false)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!tracking) return null;

  const isDelivered = tracking.status === 'DELIVERED';
  const isCancelled = ['CANCELLED', 'REJECTED', 'FAILED'].includes(tracking.status);
  const isOutForDelivery = ['SHIPPING', 'IN_TRANSIT', 'PICKED_UP'].includes(tracking.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={`Tracking #${tracking.orderNumber}`} showBack />

      {/* Offline Banner */}
      {isOffline ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#B45309" />
          <Text style={styles.offlineText}>
            Offline • Showing cached tracking
            {lastUpdated ? ` (${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
          </Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadTrackingData(false);
            }}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }>
        {/* Visual Route Graphic */}
        <View style={styles.mapVisualCard}>
          <View style={styles.mapPinSource}>
            <Ionicons name="business" size={16} color="#FFFFFF" />
          </View>
          <View
            style={[
              styles.mapRouteDashes,
              (isOutForDelivery || isDelivered) && styles.mapRouteActive,
            ]}
          />
          <View
            style={[
              styles.mapDeliveryRider,
              isDelivered && styles.mapDeliveryCompleted,
            ]}>
            <Ionicons
              name={isDelivered ? 'checkmark' : 'bicycle'}
              size={20}
              color="#FFFFFF"
            />
          </View>
          <View
            style={[
              styles.mapRouteDashes,
              isDelivered && styles.mapRouteActive,
            ]}
          />
          <View
            style={[
              styles.mapPinDest,
              isDelivered && styles.mapPinDestCompleted,
            ]}>
            <Ionicons name="home" size={16} color="#FFFFFF" />
          </View>

          <View style={styles.etaFloatingBadge}>
            <OrderStatus status={tracking.status} />
          </View>
        </View>

        {/* Dispatch & Courier Information Card */}
        {tracking.delivery?.agentName ? (
          <View style={styles.courierCard}>
            <View style={styles.courierAvatar}>
              <Ionicons name="bicycle-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.courierInfo}>
              <View style={styles.courierNameRow}>
                <Text style={styles.courierName}>{tracking.delivery.agentName}</Text>
                <View style={styles.verifiedTag}>
                  <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
                  <Text style={styles.verifiedTagText}>Assigned Rider</Text>
                </View>
              </View>
              <Text style={styles.courierSub}>
                Ardab Market Delivery • Trip #{tracking.delivery.deliveryNumber || 'Active'}
              </Text>
            </View>
            {tracking.delivery.agentPhone ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCallCourier}
                style={styles.callBtn}>
                <Ionicons name="call" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.dispatchHubCard}>
            <Ionicons name="cube-outline" size={22} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.dispatchTitle}>Fulfillment in Progress</Text>
              <Text style={styles.dispatchSub}>
                {isDelivered
                  ? 'Your package was safely delivered to your address.'
                  : isCancelled
                  ? 'This order has been cancelled.'
                  : 'Order is being verified and prepared at the central warehouse.'}
              </Text>
            </View>
          </View>
        )}

        {/* Milestones Progress Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Progress</Text>
          <OrderTimeline milestones={tracking.milestones} />
        </View>

        {/* Detailed Customer-Facing Event Activity Log */}
        {Array.isArray(tracking.timeline) && tracking.timeline.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Activity History</Text>
            <View style={styles.activityList}>
              {tracking.timeline.map((event, idx) => {
                const eventDate = new Date(event.timestamp);
                return (
                  <View key={event.id || idx} style={styles.activityItem}>
                    <View style={styles.activityDot} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityMessage}>{event.customerMessage}</Text>
                      <Text style={styles.activityTime}>
                        {eventDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        •{' '}
                        {eventDate.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Destination Information */}
        {tracking.deliveryAddress ? (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Delivery Destination</Text>
            </View>
            <Text style={styles.destName}>{tracking.deliveryAddress.recipientName}</Text>
            {tracking.deliveryAddress.phone ? (
              <Text style={styles.destPhone}>{tracking.deliveryAddress.phone}</Text>
            ) : null}
            <Text style={styles.destAddress}>
              {tracking.deliveryAddress.addressLine}, {tracking.deliveryAddress.city}
              {tracking.deliveryAddress.deliveryZone ? ` (${tracking.deliveryAddress.deliveryZone})` : ''}
            </Text>
          </View>
        ) : null}

        {/* Contact Support Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleContactSupport}
          style={styles.supportButton}>
          <Ionicons name="headset" size={18} color="#FFFFFF" />
          <Text style={styles.supportButtonText}>Contact Ardab Market Support</Text>
        </TouchableOpacity>
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
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
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
  mapVisualCard: {
    height: 160,
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
    position: 'relative',
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapPinSource: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  mapRouteDashes: {
    flex: 1,
    height: 3,
    backgroundColor: '#CBD5E1',
    marginHorizontal: Spacing.xs,
  },
  mapRouteActive: {
    backgroundColor: Colors.primary || '#16A34A',
  },
  mapDeliveryRider: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary || '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  mapDeliveryCompleted: {
    backgroundColor: Colors.success || '#15803D',
  },
  mapPinDest: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  mapPinDestCompleted: {
    backgroundColor: Colors.success || '#15803D',
  },
  etaFloatingBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    ...Shadows.sm,
  },
  courierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  courierAvatar: {
    width: 46,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight || '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  courierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  courierName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primaryLight || '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  verifiedTagText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark || '#4338CA',
  },
  courierSub: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary || '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchHubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  dispatchTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  dispatchSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  activityList: {
    paddingTop: Spacing.xs,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    marginTop: 5,
    marginRight: Spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted || '#94A3B8',
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  destName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  destPhone: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  destAddress: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary || '#4F46E5',
    paddingVertical: 14,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
});
