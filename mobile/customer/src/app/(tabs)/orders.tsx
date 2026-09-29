import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { CustomerOrder, OrderFilterTab, OrderPagination } from '@/types';
import { t } from '@/localization';
import { OrderCard } from '@/components/order';
import { EmptyState } from '@/components/common';
import { orderService } from '@/services/orderService';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/store';

const TABS: { key: OrderFilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { orders: storeOrders } = useApp();

  const [activeTab, setActiveTab] = useState<OrderFilterTab>('ALL');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [pagination, setPagination] = useState<OrderPagination>({
    page: 1,
    limit: 20,
    pageSize: 0,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const isFetchingRef = useRef(false);

  // Load orders for current active tab and specified page
  const fetchOrders = useCallback(
    async (pageToLoad: number = 1, showInitialLoading: boolean = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (showInitialLoading) {
        setIsLoading(true);
      }

      try {
        const res = await orderService.getMyOrders({
          page: pageToLoad,
          limit: 20,
          status: activeTab,
        });

        if (pageToLoad === 1) {
          const combined = [...res.orders];
          const existingIds = new Set(res.orders.map((o) => o.id));
          const existingNumbers = new Set(res.orders.map((o) => o.orderNumber));
          for (const local of storeOrders || []) {
            if (!existingIds.has(local.id) && !existingNumbers.has(local.orderNumber)) {
              if (activeTab === 'ALL') {
                combined.push(local);
              } else if (
                activeTab === 'ACTIVE' &&
                ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'ASSIGNED_TO_TRIP', 'PICKED_UP', 'IN_TRANSIT', 'SHIPPING'].includes(local.status)
              ) {
                combined.push(local);
              } else if (activeTab === 'COMPLETED' && local.status === 'DELIVERED') {
                combined.push(local);
              } else if (
                activeTab === 'CANCELLED' &&
                ['CANCELLED', 'REJECTED', 'FAILED', 'RETURNED'].includes(local.status)
              ) {
                combined.push(local);
              }
            }
          }
          setOrders(combined);
        } else {
          setOrders((prev) => {
            const existingIds = new Set(prev.map((o) => o.id));
            const fresh = res.orders.filter((o) => !existingIds.has(o.id));
            return [...prev, ...fresh];
          });
        }

        setPagination(res.pagination);
        setIsOffline(!!res.isOffline);
        setLastUpdated(res.lastUpdated || null);
      } catch (err) {
        console.warn('[OrdersScreen] Error loading orders:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [activeTab]
  );

  // Re-fetch orders when tab changes or screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchOrders(1, orders.length === 0);
    }, [fetchOrders])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchOrders(1, false);
  }, [fetchOrders]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || isRefreshing || isLoading) return;
    if (pagination.page >= pagination.totalPages) return;

    setIsLoadingMore(true);
    fetchOrders(pagination.page + 1, false);
  }, [isLoadingMore, isRefreshing, isLoading, pagination, fetchOrders]);

  const handleTabChange = (newTab: OrderFilterTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    setOrders([]);
    setIsLoading(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('orders.title') || 'My Orders'}</Text>
      </View>

      {/* Offline Notice Banner */}
      {isOffline ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#B45309" />
          <Text style={styles.offlineText}>
            You're offline. Showing cached orders
            {lastUpdated ? ` • Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
        </View>
      ) : null}

      {/* Filter Tabs Bar: All | Active | Completed | Cancelled */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}>
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => handleTabChange(tab.key)}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}>
                <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      {isLoading && orders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/orders/${item.id}` as any)}
              onTrackPress={() => router.push(`/orders/tracking?id=${item.id}` as any)}
            />
          )}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="bag-handle-outline"
              title={
                activeTab === 'ACTIVE'
                  ? 'No active orders'
                  : activeTab === 'COMPLETED'
                  ? 'No completed orders yet'
                  : activeTab === 'CANCELLED'
                  ? 'No cancelled orders'
                  : 'No orders yet'
              }
              message={
                activeTab === 'ACTIVE'
                  ? 'When you place an order, you can monitor its live status here.'
                  : 'Browse our catalog and discover fresh agricultural and market products.'
              }
              actionTitle={t('cart.startShopping') || 'Start Shopping'}
              onAction={() => router.push('/(tabs)' as any)}
            />
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineText: {
    fontSize: Typography.fontSize.xs,
    color: '#92400E',
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  tabsContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  tabButton: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
  },
  tabButtonActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge + 20,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
