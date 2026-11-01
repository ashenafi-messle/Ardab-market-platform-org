import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AgentCommissionTransaction } from '../../types/agent';
import { formatETB } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { Badge } from '../common/Badge';

export interface CommissionCardProps {
  transaction: AgentCommissionTransaction;
}

export function CommissionCard({ transaction }: CommissionCardProps) {
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
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.refCol}>
          <Text style={styles.txRef}>{transaction.transactionReference}</Text>
          <Text style={styles.orderRef}>Order: {transaction.orderReference}</Text>
        </View>
        <Badge
          label={transaction.status}
          variant={getStatusVariant(transaction.status)}
        />
      </View>

      <View style={styles.customerRow}>
        <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
        <Text style={styles.customerName}>{transaction.customerName}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.basisLabel}>
            Calculation: {transaction.commissionRate}% of {formatETB(transaction.commissionBasis)}
          </Text>
          <Text style={styles.date}>{formatDate(transaction.transactionDate)}</Text>
        </View>

        <Text style={styles.amount}>+{formatETB(transaction.commissionAmount)}</Text>
      </View>
    </View>
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
  refCol: {
    flex: 1,
  },
  txRef: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  orderRef: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 1,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  customerName: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  basisLabel: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
  },
  date: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  amount: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
});

