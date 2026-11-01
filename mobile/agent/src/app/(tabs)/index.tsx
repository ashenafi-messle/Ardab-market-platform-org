import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { useAgentAuth } from '../../store/AgentAuthContext';
import { agentApi } from '../../services/agentApi';
import {
  AgentDashboard,
  AgentOrder,
  AgentCommissionTransaction,
} from '../../types/agent';
import {
  CommissionSummaryCard,
  CustomerStatsCard,
  OrderStatsGrid,
  RecentOrdersList,
  RecentCommissionList,
} from '../../components/dashboard';
import { LoadingState, ErrorState } from '../../components/common';
import { ARDAB_LOGO_URL } from '../../constants/branding';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const { agent, unreadCount } = useAgentAuth();

  const [dashboard, setDashboard] = useState<AgentDashboard | null>(null);
  const [recentOrders, setRecentOrders] = useState<AgentOrder[]>([]);
  const [recentCommissions, setRecentCommissions] = useState<AgentCommissionTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const [dashRes, ordersRes, commRes] = await Promise.all([
        agentApi.getDashboardOverview(),
        agentApi.getOrders({ status: 'ALL' }),
        agentApi.getCommissionHistory(),
      ]);

      setDashboard(dashRes);
      setRecentOrders(ordersRes);
      setRecentCommissions(commRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load agent dashboard data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };

  // Dynamic time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = agent?.firstName || agent?.name?.split(' ')[0] || 'Agent';

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message="Loading agent dashboard..." />
      </SafeAreaView>
    );
  }

  if (error && !dashboard) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState message={error} onRetry={() => loadData(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={{ uri: ARDAB_LOGO_URL }} style={styles.headerLogo} />
          <View>
            <Text style={styles.greetingText}>
              {getGreeting()}, <Text style={styles.agentName}>{firstName}!</Text>
            </Text>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Ardab Verified Agent</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Notification Bell */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/notifications')}
            style={styles.bellButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Profile Avatar */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.avatarButton}
          >
            <Text style={styles.avatarInitials}>
              {firstName[0]}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Section A: Total Commission Balance */}
        {dashboard ? (
          <CommissionSummaryCard
            totalBalance={dashboard.totalBalance}
            totalEarned={dashboard.totalEarned}
            pendingCommission={dashboard.pendingCommission}
            approvedCommission={dashboard.approvedCommission}
            paidCommission={dashboard.paidCommission}
            assignedRate={dashboard.assignedCommissionRate}
            onViewDetails={() => router.push('/finance/commissions')}
          />
        ) : null}

        {/* Section B: Integrated Customers Summary Card */}
        {dashboard ? (
          <CustomerStatsCard
            totalCustomers={dashboard.totalCustomers}
            activeCustomers={dashboard.activeCustomers}
            onViewAllCustomers={() => router.push('/(tabs)/customers')}
          />
        ) : null}

        {/* Section C: Order Statistics Grid */}
        {dashboard ? (
          <OrderStatsGrid
            totalOrders={dashboard.totalOrders}
            acceptedOrders={dashboard.acceptedOrders}
            pendingOrders={dashboard.pendingOrders}
            completedOrders={dashboard.completedOrders}
          />
        ) : null}

        {/* Section D: Recent Accepted Orders */}
        <RecentOrdersList
          orders={recentOrders}
          onSelectOrder={(order) => router.push(`/orders/${order.id}`)}
          onViewAllOrders={() => router.push('/(tabs)/orders')}
        />

        {/* Section E: Recent Commission Activity */}
        <RecentCommissionList
          transactions={recentCommissions}
          onViewAllHistory={() => router.push('/finance/commissions')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  greetingText: {
    fontSize: Typography.fontSize.sm + 1,
    color: Colors.textSecondary,
  },
  agentName: {
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.semibold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
});

