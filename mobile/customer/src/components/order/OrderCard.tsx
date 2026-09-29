import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { CustomerOrder } from '@/types';
import { formatPrice } from '@/localization';
import { OrderStatus } from './OrderStatus';

export interface OrderCardProps {
  order: CustomerOrder;
  onPress: () => void;
  onTrackPress?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onTrackPress,
}) => {
  // Compute item count from either itemCount summary or items array
  const itemCount =
    order.itemCount !== undefined
      ? order.itemCount
      : order.items?.reduce((acc, item) => acc + (item.quantity || 1), 0) || 0;

  // Extract thumbnail image URLs from previewImages or items
  const thumbnailUrls: string[] = [];
  if (Array.isArray(order.previewImages) && order.previewImages.length > 0) {
    thumbnailUrls.push(...order.previewImages.filter(Boolean));
  } else if (Array.isArray(order.items)) {
    for (const item of order.items) {
      const img = item.productImage || item.product?.images?.[0];
      if (img && !thumbnailUrls.includes(img)) {
        thumbnailUrls.push(img);
      }
      if (thumbnailUrls.length >= 3) break;
    }
  }

  // Authoritative total price in ETB
  const totalAmount =
    order.totalEtb !== undefined
      ? order.totalEtb
      : Number(order.totalAmount || order.total || 0);

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

  const isCompleted = order.status === 'DELIVERED';
  const isCancelled = ['CANCELLED', 'REJECTED', 'FAILED', 'RETURNED'].includes(order.status);

  const orderDate = new Date(order.placedAt || order.createdAt || Date.now());
  const formattedDate = orderDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
        <OrderStatus status={order.status} />
      </View>

      {/* Thumbnails & Totals row */}
      <View style={styles.thumbnailsRow}>
        <View style={styles.imagesContainer}>
          {thumbnailUrls.slice(0, 3).map((uri, index) => (
            <View key={index} style={styles.thumbnailWrapper}>
              <Image
                source={{ uri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </View>
          ))}
          {itemCount > 3 ? (
            <View style={styles.moreThumbnail}>
              <Text style={styles.moreText}>+{itemCount - 3}</Text>
            </View>
          ) : thumbnailUrls.length === 0 ? (
            <View style={[styles.thumbnailWrapper, styles.placeholderThumbnail]}>
              <Ionicons name="cube-outline" size={24} color={Colors.textMuted} />
            </View>
          ) : null}
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.itemCountText}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
          <Text style={styles.totalText}>{formatPrice(totalAmount)}</Text>
        </View>
      </View>

      {/* Footer / Actions */}
      <View style={styles.footer}>
        <View style={styles.deliveryInfo}>
          <Ionicons
            name={isCompleted ? 'checkmark-circle-outline' : isActive ? 'navigate-outline' : 'alert-circle-outline'}
            size={14}
            color={isCompleted ? Colors.success : isActive ? Colors.primary : Colors.textMuted}
          />
          <Text style={styles.deliveryText} numberOfLines={1}>
            {order.delivery?.status
              ? `Delivery: ${order.delivery.status}`
              : order.city
              ? `Destination: ${order.city}`
              : 'Standard Delivery'}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          {isActive ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                if (onTrackPress) onTrackPress();
                else onPress();
              }}
              style={styles.trackBtn}>
              <Ionicons name="navigate-outline" size={13} color={Colors.primaryDark} />
              <Text style={styles.trackBtnText}>Track Order</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>
              {isCompleted ? 'View Order' : isCancelled ? 'View Details' : 'Details'}
            </Text>
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
    letterSpacing: 0.2,
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
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  placeholderThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  moreThumbnail: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
    fontWeight: Typography.fontWeight.medium,
  },
});
