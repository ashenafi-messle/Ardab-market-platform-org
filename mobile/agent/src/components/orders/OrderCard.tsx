import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AgentOrder } from '../../types/agent';
import { formatETB } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { Badge } from '../common/Badge';

export interface OrderCardProps {
  order: AgentOrder;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
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
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.refColumn}>
          <Text style={styles.orderRef}>{order.orderReference}</Text>
          <Text style={styles.orderDate}>{formatDate(order.orderDate)}</Text>
        </View>
        <Badge
          label={order.orderStatus}
          variant={getStatusVariant(order.orderStatus)}
        />
      </View>

      <View style={styles.customerRow}>
        <Ionicons name="person-circle-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.customerName}>{order.customerName}</Text>
        {order.itemsCount ? (
          <Text style={styles.itemsCount}>• {order.itemsCount} items</Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.financialRow}>
        <View>
          <Text style={styles.fieldLabel}>Order Value</Text>
          <Text style={styles.orderTotal}>{formatETB(order.orderTotal)}</Text>
        </View>

        <View style={styles.commissionBox}>
          <Text style={styles.commissionLabel}>
            Commission ({order.commissionRate}%)
          </Text>
          <Text style={styles.commissionValue}>
            +{formatETB(order.commissionAmount)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
    marginBottom: Spacing.sm + 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  refColumn: {
    flex: 1,
  },
  orderRef: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  orderDate: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    marginTop: 1,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: Spacing.xs,
  },
  customerName: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  itemsCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  orderTotal: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 1,
  },
  commissionBox: {
    alignItems: 'flex-end',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
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
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    marginTop: 1,
  },
});

