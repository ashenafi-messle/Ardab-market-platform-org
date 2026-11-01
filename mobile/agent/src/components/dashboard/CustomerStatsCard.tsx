import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';

export interface CustomerStatsCardProps {
  totalCustomers: number;
  activeCustomers: number;
  onViewAllCustomers?: () => void;
}

export function CustomerStatsCard({
  totalCustomers,
  activeCustomers,
  onViewAllCustomers,
}: CustomerStatsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="people" size={20} color={Colors.primary} />
        </View>
        <View style={styles.activePill}>
          <View style={styles.activeDot} />
          <Text style={styles.activePillText}>{activeCustomers} Active</Text>
        </View>
      </View>

      <Text style={styles.title}>Integrated Customers</Text>
      <View style={styles.numberRow}>
        <Text style={styles.count}>{totalCustomers}</Text>
        <Text style={styles.countLabel}>Customers</Text>
      </View>

      <Text style={styles.subtext}>
        Verified customers currently associated with your agent referral account.
      </Text>

      {onViewAllCustomers ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onViewAllCustomers}
          style={styles.viewBtn}
        >
          <Text style={styles.viewBtnText}>View All Customers</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  activePillText: {
    fontSize: Typography.fontSize.tiny,
    color: '#065F46',
    fontWeight: Typography.fontWeight.semibold,
  },
  title: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  count: {
    fontSize: Typography.fontSize.title,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  countLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.medium,
  },
  subtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  viewBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
});

