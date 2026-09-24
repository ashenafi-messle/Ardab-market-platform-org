import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { AppHeader } from '@/components/common';
import { OrderTimeline } from '@/components/order';
import { t } from '@/localization';

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, language } = useApp();

  const order = orders.find((o) => o.id === id) || orders[0];

  const handleCallCourier = () => {
    Linking.openURL('tel:+251911998877').catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={`${t('orders.trackOrder')} #${order.orderNumber}`} showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Map Placeholder Graphic with Route line */}
        <View style={styles.mapVisualCard}>
          <View style={styles.mapPinSource}>
            <Ionicons name="business" size={16} color={Colors.textInverse} />
          </View>
          <View style={styles.mapRouteDashes} />
          <View style={styles.mapDeliveryRider}>
            <Ionicons name="bicycle" size={20} color={Colors.textInverse} />
          </View>
          <View style={styles.mapRouteDashes} />
          <View style={styles.mapPinDest}>
            <Ionicons name="home" size={16} color={Colors.textInverse} />
          </View>

          <View style={styles.etaFloatingBadge}>
            <Ionicons name="time" size={14} color={Colors.primaryDark} />
            <Text style={styles.etaText}>{t('orders.deliveryEstimate')}: {order.estimatedDelivery}</Text>
          </View>
        </View>

        {/* Courier Contact Card */}
        <View style={styles.courierCard}>
          <View style={styles.courierAvatar}>
            <Ionicons name="person" size={24} color={Colors.primary} />
          </View>
          <View style={styles.courierInfo}>
            <View style={styles.courierNameRow}>
              <Text style={styles.courierName}>Abebe Kebede</Text>
              <View style={styles.verifiedTag}>
                <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
                <Text style={styles.verifiedTagText}>{t('common.verified')}</Text>
              </View>
            </View>
            <Text style={styles.courierSub}>Gondar Local Dispatch Hub</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCallCourier}
            style={styles.callBtn}>
            <Ionicons name="call" size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Full Tracking Milestones Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('orders.orderTimeline')}</Text>
          <OrderTimeline steps={order.trackingSteps} />
        </View>

        {/* Destination Info */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
          </View>
          <Text style={styles.destName}>{order.shippingAddress.fullName}</Text>
          <Text style={styles.destAddress}>
            {order.shippingAddress.specificAddress}, {order.shippingAddress.city}
          </Text>
        </View>
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
  mapVisualCard: {
    height: 180,
    backgroundColor: '#E2E8F0',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
    position: 'relative',
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapPinSource: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  mapRouteDashes: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.primaryMuted,
    marginHorizontal: Spacing.xs,
  },
  mapDeliveryRider: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  mapPinDest: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  etaFloatingBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    ...Shadows.sm,
  },
  etaText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
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
    backgroundColor: Colors.primaryLight,
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
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  verifiedTagText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
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
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  destAddress: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
});
