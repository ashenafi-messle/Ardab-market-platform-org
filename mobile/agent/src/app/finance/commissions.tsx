import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader, EmptyState, LoadingState, ErrorState } from '../../components/common';
import { CommissionCard } from '../../components/finance';
import { agentApi } from '../../services/agentApi';
import { AgentDashboard, AgentCommissionTransaction } from '../../types/agent';
import { formatETB } from '../../utils/currency';

export default function CommissionHistoryScreen() {
  const [dashboard, setDashboard] = useState<AgentDashboard | null>(null);
  const [transactions, setTransactions] = useState<AgentCommissionTransaction[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const [dash, txs] = await Promise.all([
        agentApi.getDashboardOverview(),
        agentApi.getCommissionHistory({ status: selectedFilter }),
      ]);
      setDashboard(dash);
      setTransactions(txs);
    } catch (err: any) {
      setError(err?.message || 'Failed to load commission history.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };

  const filterTabs = [
    { key: 'ALL', label: 'All Transactions' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'PAID', label: 'Paid Out' },
    { key: 'PENDING', label: 'Pending' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Commission & Financials"
        subtitle="Earnings ledger & settlement history"
        showBack
      />

      {/* Financial Overview Card */}
      {dashboard ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>Total Earned (Lifetime)</Text>
              <Text style={styles.summaryMain}>{formatETB(dashboard.totalEarned)}</Text>
            </View>
            <View style={styles.goldBadge}>
              <Text style={styles.goldBadgeText}>{dashboard.assignedCommissionRate}% Rate</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Approved Balance</Text>
              <Text style={[styles.breakdownVal, { color: '#34D399' }]}>
                {formatETB(dashboard.approvedCommission)}
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Pending</Text>
              <Text style={[styles.breakdownVal, { color: '#FBBF24' }]}>
                {formatETB(dashboard.pendingCommission)}
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Paid Out</Text>
              <Text style={[styles.breakdownVal, { color: '#60A5FA' }]}>
                {formatETB(dashboard.paidCommission)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterTabs.map((tab) => {
            const isSelected = selectedFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.7}
                onPress={() => setSelectedFilter(tab.key)}
                style={[styles.filterTab, isSelected && styles.filterTabActive]}
              >
                <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Transactions List */}
      {isLoading && !isRefreshing ? (
        <LoadingState message="Loading commission transactions..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadData(true)} />
      ) : (
        <FlatList<AgentCommissionTransaction>
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommissionCard transaction={item} />}
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
              icon="wallet-outline"
              title="No Transactions Found"
              message="Commission transactions from accepted customer orders will appear here."
              actionTitle={selectedFilter !== 'ALL' ? 'View All' : undefined}
              onAction={() => setSelectedFilter('ALL')}
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
  summaryCard: {
    backgroundColor: Colors.financialDark,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    ...Shadows.md,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: Typography.fontSize.tiny,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryMain: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.heavy,
    color: '#FFFFFF',
    marginTop: 2,
  },
  goldBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  goldBadgeText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.gold,
    fontWeight: Typography.fontWeight.bold,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: Typography.fontSize.tiny,
    color: '#9CA3AF',
  },
  breakdownVal: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
  },
  filterContainer: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs + 2,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  filterTabText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.semibold,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
});
