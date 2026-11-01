import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { AppHeader, SearchBar, EmptyState, LoadingState, ErrorState } from '../../components/common';
import { OrderCard, OrderFilterTabs } from '../../components/orders';
import { agentApi } from '../../services/agentApi';
import { AgentOrder } from '../../types/agent';

export default function OrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<AgentOrder[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const data = await agentApi.getOrders({
        status: selectedStatus,
        search: searchQuery,
      });
      setOrders(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch customer orders.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadOrders(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Attributed Orders"
        subtitle="Customer orders linked to your agent account"
      />

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by order ref or customer..."
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrapper}>
        <OrderFilterTabs
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
        />
      </View>

      {/* Orders List / States */}
      {isLoading && !isRefreshing ? (
        <LoadingState message="Loading attributed orders..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadOrders(true)} />
      ) : (
        <FlatList<AgentOrder>
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/orders/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title="No Orders Found"
              message={
                searchQuery || selectedStatus !== 'ALL'
                  ? 'No attributed orders match your active search and filter criteria.'
                  : 'Orders placed by your integrated customers will appear here.'
              }
              actionTitle={searchQuery || selectedStatus !== 'ALL' ? 'Clear Filters' : undefined}
              onAction={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
              }}
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
    backgroundColor: Colors.surface,
  },
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.background,
  },
  filterWrapper: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
});
