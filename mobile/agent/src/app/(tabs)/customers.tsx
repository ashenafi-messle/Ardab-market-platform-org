import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader, SearchBar, EmptyState, LoadingState, ErrorState } from '../../components/common';
import { CustomerCard } from '../../components/customers';
import { agentApi } from '../../services/agentApi';
import { AgentCustomer } from '../../types/agent';

export default function CustomersScreen() {
  const router = useRouter();

  const [customers, setCustomers] = useState<AgentCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const data = await agentApi.getCustomers({ search: searchQuery });
      setCustomers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch integrated customers.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCustomers(false);
  };

  const activeCount = customers.filter((c: AgentCustomer) => c.integrationStatus === 'ACTIVE').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Integrated Customers"
        subtitle="Verified customers linked to your agent referral ID"
      />

      {/* Top Customer Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Integrated</Text>
          <View style={styles.statValueRow}>
            <Ionicons name="people" size={18} color={Colors.primary} />
            <Text style={styles.statValue}>{customers.length}</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Active Customers</Text>
          <View style={styles.statValueRow}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {activeCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search customer by name, email, or phone..."
        />
      </View>

      {/* Customers List / States */}
      {isLoading && !isRefreshing ? (
        <LoadingState message="Loading your integrated customers..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadCustomers(true)} />
      ) : (
        <FlatList<AgentCustomer>
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              onPress={() => router.push(`/customers/${item.id}`)}
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
              icon="people-outline"
              title="No Customers Found"
              message={
                searchQuery
                  ? `No integrated customer found matching "${searchQuery}".`
                  : 'Customers who connect with your agent email will be displayed here once approved by Super Admin.'
              }
              actionTitle={searchQuery ? 'Clear Search' : undefined}
              onAction={() => setSearchQuery('')}
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
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...Shadows.sm,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.borderLight,
  },
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
});
