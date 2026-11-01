import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader, Badge, LoadingState, ErrorState } from '../../components/common';
import { agentApi } from '../../services/agentApi';
import { AgentCustomer, AgentOrder } from '../../types/agent';
import { formatETB } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { OrderCard } from '../../components/orders';

export default function CustomerDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const customerId = params.id;

  const [customer, setCustomer] = useState<AgentCustomer | null>(null);
  const [orders, setOrders] = useState<AgentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomerData() {
      if (!customerId) return;
      setIsLoading(true);
      setError(null);

      try {
        const res = await agentApi.getCustomerById(customerId);
        if (!res) {
          setError('Integrated customer not found.');
        } else {
          setCustomer(res.customer);
          setOrders(res.attributedOrders);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load customer profile.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCustomerData();
  }, [customerId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Customer Profile" showBack />
        <LoadingState message="Loading customer details..." />
      </SafeAreaView>
    );
  }

  if (error || !customer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Customer Profile" showBack />
        <ErrorState
          message={error || 'Customer not found.'}
          onRetry={() => router.back()}
          retryTitle="Go Back"
        />
      </SafeAreaView>
    );
  }

  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={customer.name}
        subtitle="Integrated Customer Profile"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerEmail}>{customer.email}</Text>
          <Text style={styles.customerPhone}>{customer.phone}</Text>

          <View style={styles.statusBadgeRow}>
            <Badge
              label={customer.integrationStatus}
              variant={customer.integrationStatus === 'ACTIVE' ? 'success' : 'neutral'}
              size="md"
            />
            <Text style={styles.integratedDate}>
              Integrated on {formatDate(customer.integratedAt)}
            </Text>
          </View>
        </View>

        {/* Financial Metrics Summary */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Orders</Text>
            <Text style={styles.metricValue}>{customer.attributedOrdersCount}</Text>
            <Text style={styles.metricSub}>Attributed</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Value</Text>
            <Text style={styles.metricValue}>{formatETB(customer.totalOrderValue)}</Text>
            <Text style={styles.metricSub}>Purchases</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardHighlight]}>
            <Text style={[styles.metricLabel, { color: Colors.primaryDark }]}>
              Commission
            </Text>
            <Text style={[styles.metricValue, { color: Colors.primary }]}>
              {formatETB(customer.generatedCommission)}
            </Text>
            <Text style={styles.metricSub}>Earned</Text>
          </View>
        </View>

        {/* Attributed Orders Section */}
        <View style={styles.ordersSection}>
          <Text style={styles.sectionTitle}>
            Attributed Orders ({orders.length})
          </Text>

          {orders.length === 0 ? (
            <View style={styles.emptyOrdersCard}>
              <Text style={styles.emptyOrdersText}>
                No attributed orders recorded for this customer yet.
              </Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => router.push(`/orders/${order.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  customerName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  customerEmail: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  customerPhone: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  integratedDate: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadows.sm,
  },
  metricCardHighlight: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryMuted,
  },
  metricLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: Typography.fontWeight.semibold,
  },
  metricValue: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginVertical: 2,
  },
  metricSub: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  ordersSection: {
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  ordersList: {
    gap: Spacing.xs,
  },
  emptyOrdersCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyOrdersText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

