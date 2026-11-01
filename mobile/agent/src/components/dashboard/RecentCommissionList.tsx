import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AgentCommissionTransaction } from '../../types/agent';
import { formatETB } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { Badge } from '../common/Badge';

export interface RecentCommissionListProps {
  transactions: AgentCommissionTransaction[];
  onViewAllHistory?: () => void;
}

export function RecentCommissionList({
  transactions,
  onViewAllHistory,
}: RecentCommissionListProps) {
  const getStatusVariant = (status: AgentCommissionTransaction['status']) => {
    switch (status) {
      case 'PAID':
        return 'info';
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Recent Commission Activity</Text>
        {onViewAllHistory ? (
          <TouchableOpacity activeOpacity={0.7} onPress={onViewAllHistory}>
            <Text style={styles.seeAllText}>Full History</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recent commission records.</Text>
        </View>
      ) : (
        <View style={styles.cardWrapper}>
          {transactions.slice(0, 4).map((tx, idx) => (
            <View
              key={tx.id}
              style={[
                styles.txRow,
                idx < transactions.length - 1 ? styles.borderBottom : null,
              ]}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name={tx.status === 'PAID' ? 'cash-outline' : 'receipt-outline'}
                  size={18}
                  color={tx.status === 'PAID' ? Colors.info : Colors.primary}
                />
              </View>

              <View style={styles.txInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.orderRef}>{tx.orderReference}</Text>
                  <Text style={styles.amount}>+{formatETB(tx.commissionAmount)}</Text>
                </View>

                <View style={styles.subRow}>
                  <Text style={styles.customerName}>{tx.customerName}</Text>
                  <Badge label={tx.status} variant={getStatusVariant(tx.status)} />
                </View>

                <Text style={styles.date}>{formatDate(tx.transactionDate)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
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
  cardWrapper: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  txInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderRef: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  amount: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  customerName: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  date: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    marginTop: 2,
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

