import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';

export interface OrderStatsGridProps {
  totalOrders: number;
  acceptedOrders: number;
  pendingOrders: number;
  completedOrders: number;
}

export function OrderStatsGrid({
  totalOrders,
  acceptedOrders,
  pendingOrders,
  completedOrders,
}: OrderStatsGridProps) {
  const items = [
    {
      title: 'Total Attributed',
      value: totalOrders,
      icon: 'cube-outline' as const,
      color: Colors.primaryDark,
      bgColor: Colors.primaryLight,
    },
    {
      title: 'Accepted Orders',
      value: acceptedOrders,
      icon: 'checkmark-circle-outline' as const,
      color: '#059669',
      bgColor: '#ECFDF5',
    },
    {
      title: 'Pending Approval',
      value: pendingOrders,
      icon: 'time-outline' as const,
      color: '#D97706',
      bgColor: '#FEF3C7',
    },
    {
      title: 'Completed',
      value: completedOrders,
      icon: 'bag-check-outline' as const,
      color: '#2563EB',
      bgColor: '#EFF6FF',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Order Statistics</Text>
      <View style={styles.grid}>
        {items.map((item, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.topRow}>
              <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.value}>{item.value}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  title: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 2,
  },
});

