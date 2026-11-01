import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { formatETB } from '../../utils/currency';

export interface CommissionSummaryCardProps {
  totalBalance: number;
  totalEarned: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
  assignedRate?: number;
  onViewDetails?: () => void;
}

export function CommissionSummaryCard({
  totalBalance,
  totalEarned,
  pendingCommission,
  approvedCommission,
  paidCommission,
  assignedRate = 5.0,
  onViewDetails,
}: CommissionSummaryCardProps) {
  return (
    <View style={styles.card}>
      {/* Top Banner with Commission Rate Badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="wallet-outline" size={18} color={Colors.gold} />
          <Text style={styles.headerTitle}>Total Commission Balance</Text>
        </View>
        <View style={styles.rateBadge}>
          <Text style={styles.rateBadgeText}>{assignedRate.toFixed(1)}% Rate</Text>
        </View>
      </View>

      {/* Primary Balance Display */}
      <Text style={styles.mainBalance}>{formatETB(totalBalance)}</Text>
      <Text style={styles.balanceExplainer}>
        Available approved commission ready for settlement
      </Text>

      {/* Financial Breakdown Grid */}
      <View style={styles.grid}>
        {/* Total Earned */}
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Total Earned</Text>
          <Text style={styles.gridValue}>{formatETB(totalEarned)}</Text>
          <Text style={styles.gridSub}>Lifetime</Text>
        </View>

        {/* Pending */}
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Pending</Text>
          <Text style={[styles.gridValue, styles.pendingColor]}>
            {formatETB(pendingCommission)}
          </Text>
          <Text style={styles.gridSub}>Awaiting Orders</Text>
        </View>

        {/* Paid */}
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Paid Out</Text>
          <Text style={[styles.gridValue, styles.paidColor]}>
            {formatETB(paidCommission)}
          </Text>
          <Text style={styles.gridSub}>Disbursed</Text>
        </View>
      </View>

      {/* Action Footer */}
      {onViewDetails ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onViewDetails}
          style={styles.actionRow}
        >
          <Text style={styles.actionText}>View Commission History</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.gold} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.financialDark,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.35)', // subtle gold border
    ...Shadows.md,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xs + 1,
    color: '#D1D5DB',
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rateBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  rateBadgeText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.gold,
    fontWeight: Typography.fontWeight.bold,
  },
  mainBalance: {
    fontSize: Typography.fontSize.display,
    fontWeight: Typography.fontWeight.heavy,
    color: '#FFFFFF',
    marginTop: Spacing.xs,
    letterSpacing: -0.5,
  },
  balanceExplainer: {
    fontSize: Typography.fontSize.xs,
    color: '#9CA3AF',
    marginBottom: Spacing.md,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: Typography.fontSize.tiny,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  pendingColor: {
    color: '#FBBF24', // Amber
  },
  paidColor: {
    color: '#60A5FA', // Blue
  },
  gridSub: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.gold,
    fontWeight: Typography.fontWeight.semibold,
  },
});

