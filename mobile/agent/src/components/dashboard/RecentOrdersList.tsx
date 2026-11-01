import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AgentOrder } from '../../types/agent';
import { formatETB } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { Badge } from '../common/Badge';

export interface RecentOrdersListProps {
  orders: AgentOrder[];
  onSelectOrder: (order: AgentOrder) => void;
  onViewAllOrders?: () => void;
}

export function RecentOrdersList({
  orders,
  onSelectOrder,
  onViewAllOrders,
}: RecentOrdersListProps) {
  const getStatusVariant = (status: AgentOrder['orderStatus']) => {
    switch (status) {
      case 'ACCEPTED':
        return 'success';
      case 'COMPLETED':
        return 'info';
      case 'PENDING':
        return 'warning';
      case 'PROCESSING':
        return 'gold';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Recent Accepted Orders</Text>
        {onViewAllOrders ? (
          <TouchableOpacity activeOpacity={0.7} onPress={onViewAllOrders}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recent orders recorded.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {orders.slice(0, 4).map((order) => (
            <TouchableOpacity
              key={order.id}
              activeOpacity={0.75}
              onPress={() => onSelectOrder(order)}
              style={styles.orderCard}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.orderRef}>{order.orderReference}</Text>
                  <Text style={styles.customerName}>{order.customerName}</Text>
                </View>
                <Badge
                  label={order.orderStatus}
                  variant={getStatusVariant(order.orderStatus)}
                />
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.dateText}>{formatDate(order.orderDate)}</Text>
                  <Text style={styles.totalText}>{formatETB(order.orderTotal)}</Text>
                </View>

                <View style={styles.commissionPill}>
                  <Text style={styles.commissionLabel}>Commission</Text>
                  <Text style={styles.commissionValue}>
                    +{formatETB(order.commissionAmount)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAllText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  list: {
    gap: Spacing.sm,
  },
  orderCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  orderRef: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  customerName: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  dateText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
  },
  totalText: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 1,
  },
  commissionPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
  },
  commissionLabel: {
    fontSize: 9,
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    fontWeight: Typography.fontWeight.medium,
  },
  commissionValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});

