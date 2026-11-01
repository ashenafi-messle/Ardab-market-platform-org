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
import { AgentOrder } from '../../types/agent';
import { formatETB } from '../../utils/currency';
import { formatDate, formatDateTime } from '../../utils/date';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<AgentOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await agentApi.getOrderById(orderId);
        if (!data) {
          setError('Order details not found.');
        } else {
          setOrder(data);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load order details.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Order Details" showBack />
        <LoadingState message="Loading order details..." />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Order Details" showBack />
        <ErrorState
          message={error || 'Order not found.'}
          onRetry={() => router.back()}
          retryTitle="Go Back"
        />
      </SafeAreaView>
    );
  }

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
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={order.orderReference}
        subtitle={`Placed on ${formatDate(order.orderDate)}`}
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Header Card */}
        <View style={styles.card}>
          <View style={styles.statusHeaderRow}>
            <View>
              <Text style={styles.sectionLabel}>Order Status</Text>
              <Text style={styles.orderStatusTitle}>{order.orderStatus}</Text>
            </View>
            <Badge
              label={order.orderStatus}
              variant={getStatusVariant(order.orderStatus)}
              size="md"
            />
          </View>

          <Text style={styles.orderDateTime}>
            Timestamp: {formatDateTime(order.orderDate)}
          </Text>
        </View>

        {/* Section 1: Agent Commission Information */}
        <View style={styles.commissionCard}>
          <View style={styles.commissionHeaderRow}>
            <View style={styles.commissionIconCircle}>
              <Ionicons name="sparkles" size={18} color={Colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.commissionCardSubtitle}>Agent Commission</Text>
              <Text style={styles.commissionCardTitle}>Attributed Earnings</Text>
            </View>
            <Badge
              label={order.commissionStatus}
              variant={order.commissionStatus === 'APPROVED' ? 'gold' : 'neutral'}
            />
          </View>

          <View style={styles.commissionDivider} />

          <View style={styles.commissionGrid}>
            <View style={styles.commissionItem}>
              <Text style={styles.commGridLabel}>Commission Rate</Text>
              <Text style={styles.commGridVal}>{order.commissionRate}%</Text>
            </View>

            <View style={styles.commissionItem}>
              <Text style={styles.commGridLabel}>Calculated Amount</Text>
              <Text style={styles.commAmountVal}>
                +{formatETB(order.commissionAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.basisBox}>
            <Text style={styles.basisText}>
              Calculation Basis: <Text style={styles.basisHighlight}>{order.commissionBasis}</Text>
            </Text>
            <Text style={styles.basisNote}>
              Commission is attributed authoritatively upon Super Admin order acceptance.
            </Text>
          </View>
        </View>

        {/* Section 2: Customer Information */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Customer Information</Text>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={Colors.primary} />
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Customer Name</Text>
              <Text style={styles.infoValue}>{order.customerName}</Text>
            </View>
          </View>

          {order.customerPhone ? (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={Colors.primary} />
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{order.customerPhone}</Text>
              </View>
            </View>
          ) : null}

          {order.customerEmail ? (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={Colors.primary} />
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{order.customerEmail}</Text>
              </View>
            </View>
          ) : null}

          {order.deliveryAddress ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Delivery Destination</Text>
                <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Section 3: Ordered Products */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Order Items ({order.items?.length || 0})</Text>

          {order.items?.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                idx < (order.items?.length || 0) - 1 ? styles.itemBorder : null,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>
                  Qty: {item.quantity} × {formatETB(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatETB(item.totalPrice)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Method</Text>
            <Text style={styles.summaryValue}>{order.paymentMethod}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Order Amount</Text>
            <Text style={styles.totalAmount}>{formatETB(order.orderTotal)}</Text>
          </View>
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
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderStatusTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 2,
  },
  orderDateTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  commissionCard: {
    backgroundColor: Colors.financialDark,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    ...Shadows.md,
  },
  commissionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  commissionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commissionCardSubtitle: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commissionCardTitle: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
    marginTop: 1,
  },
  commissionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: Spacing.md,
  },
  commissionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  commissionItem: {
    flex: 1,
  },
  commGridLabel: {
    fontSize: Typography.fontSize.tiny,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  commGridVal: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  commAmountVal: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.heavy,
    color: '#34D399',
    marginTop: 2,
  },
  basisBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  basisText: {
    fontSize: Typography.fontSize.xs,
    color: '#D1D5DB',
  },
  basisHighlight: {
    color: Colors.gold,
    fontWeight: Typography.fontWeight.semibold,
  },
  basisNote: {
    fontSize: Typography.fontSize.tiny,
    color: '#9CA3AF',
    marginTop: 3,
    fontStyle: 'italic',
  },
  cardHeading: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
    marginTop: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  itemQty: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs + 2,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  totalLabel: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  totalAmount: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
});

