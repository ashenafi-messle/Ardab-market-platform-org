// ==============================================================================
// Ardab Market - Customer Payment & Transaction History Screen
// ==============================================================================
// Displays paginated transaction history, receipts, payment statuses, and channels.
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader } from '@/components/common';
import { paymentService, PaymentHistoryItem } from '@/services/paymentService';
import { formatPrice } from '@/localization';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await paymentService.getPaymentHistory(undefined, 20);
      setPayments(res.items || []);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err: any) {
      console.warn('[PaymentHistory] Failed to fetch history:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await paymentService.getPaymentHistory(nextCursor, 20);
      setPayments((prev) => [...prev, ...(res.items || [])]);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err: any) {
      console.warn('[PaymentHistory] Error loading more:', err.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const renderItem = ({ item }: { item: PaymentHistoryItem }) => {
    const isSuccess = item.status === 'SUCCESS';
    const isPending = item.status === 'PENDING' || item.status === 'PROCESSING';
    const isFailed = item.status === 'FAILED';

    const dateStr = new Date(item.paidAt || item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => item.orderId && router.push(`/orders/${item.orderId}` as any)}
        style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={isSuccess ? 'checkmark-circle' : isPending ? 'time' : 'alert-circle'}
              size={24}
              color={isSuccess ? '#059669' : isPending ? '#D97706' : '#DC2626'}
            />
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={styles.orderNumber}>
              {item.orderNumber ? `Order #${item.orderNumber}` : 'Marketplace Order'}
            </Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountText}>{formatPrice(Number(item.amount))}</Text>
            <View
              style={[
                styles.badge,
                isSuccess
                  ? styles.badgeSuccess
                  : isPending
                  ? styles.badgePending
                  : styles.badgeFailed,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  isSuccess
                    ? styles.badgeTextSuccess
                    : isPending
                    ? styles.badgeTextPending
                    : styles.badgeTextFailed,
                ]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.refText}>Ref: {item.txRef}</Text>
          <Text style={styles.methodText}>Channel: {item.paymentMethod || 'ONLINE'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Payment History" showBack />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading transaction history...</Text>
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="card-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Transactions Yet</Text>
          <Text style={styles.emptySub}>
            Your completed and pending marketplace payments will appear here with verified receipts.
          </Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchHistory(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={{ paddingVertical: Spacing.md }}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.huge,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptySub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  dateText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeSuccess: {
    backgroundColor: '#DEF7EC',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeFailed: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  badgeTextSuccess: {
    color: '#03543F',
  },
  badgeTextPending: {
    color: '#92400E',
  },
  badgeTextFailed: {
    color: '#991B1B',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  refText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  methodText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
});
