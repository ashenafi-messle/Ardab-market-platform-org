import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AgentCustomer } from '../../types/agent';
import { formatETB } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { Badge } from '../common/Badge';

export interface CustomerCardProps {
  customer: AgentCustomer;
  onPress: () => void;
}

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  // Extract initials
  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.name}>{customer.name}</Text>
          <Text style={styles.email}>{customer.email}</Text>
          <Text style={styles.phone}>{customer.phone}</Text>
        </View>

        <Badge
          label={customer.integrationStatus}
          variant={customer.integrationStatus === 'ACTIVE' ? 'success' : 'neutral'}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Integrated Since</Text>
          <Text style={styles.statValue}>{formatDate(customer.integratedAt)}</Text>
        </View>

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Orders</Text>
          <Text style={styles.statValue}>{customer.attributedOrdersCount}</Text>
        </View>

        <View style={styles.statColEnd}>
          <Text style={styles.statLabel}>Commission</Text>
          <Text style={styles.commissionValue}>
            {formatETB(customer.generatedCommission)}
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
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  email: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  phone: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
  },
  statColEnd: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginTop: 1,
  },
  commissionValue: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    marginTop: 1,
  },
});

