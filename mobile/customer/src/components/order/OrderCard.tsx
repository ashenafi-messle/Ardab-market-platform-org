import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { Order } from '@/types';
import { formatPrice, t } from '@/localization';
import { OrderStatus } from './OrderStatus';

export interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onTrackPress?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onTrackPress,
}) => {
  const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.date}>
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        <OrderStatus status={order.status} />
      </View>

      {/* Thumbnails row */}
      <View style={styles.thumbnailsRow}>
        <View style={styles.imagesContainer}>
          {order.items.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.thumbnailWrapper}>
              <Image
                source={{ uri: item.product.images[0] }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </View>
          ))}
          {order.items.length > 3 ? (
            <View style={styles.moreThumbnail}>
              <Text style={styles.moreText}>+{order.items.length - 3}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.itemCountText}>
            {itemCount} {t('common.items')}
          </Text>
          <Text style={styles.totalText}>{formatPrice(order.total)}</Text>
        </View>
      </View>

      {/* Footer / Actions */}
      <View style={styles.footer}>
        <View style={styles.deliveryInfo}>
          <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.deliveryText} numberOfLines={1}>
            {order.estimatedDelivery}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          {order.status === 'SHIPPING' || order.status === 'PROCESSING' ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                if (onTrackPress) onTrackPress();
                else onPress();
              }}
              style={styles.trackBtn}>
              <Ionicons name="navigate-outline" size={14} color={Colors.primary} />
              <Text style={styles.trackBtnText}>{t('orders.trackOrder')}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>{t('orders.viewDetails')}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  orderNumber: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  date: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  imagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  thumbnailWrapper: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  moreThumbnail: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  summaryContainer: {
    alignItems: 'flex-end',
  },
  itemCountText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  totalText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: Spacing.sm,
  },
  deliveryText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.sm,
  },
  trackBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primaryDark,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: Spacing.xs,
  },
  detailsBtnText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
});
