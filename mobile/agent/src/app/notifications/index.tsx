import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader, EmptyState, LoadingState, ErrorState, Badge, AppButton } from '../../components/common';
import { agentApi } from '../../services/agentApi';
import { AgentNotification } from '../../types/agent';
import { useAgentAuth } from '../../store/AgentAuthContext';
import { formatETB } from '../../utils/currency';
import { timeAgo } from '../../utils/date';

export default function NotificationsScreen() {
  const router = useRouter();
  const { setUnreadCount } = useAgentAuth();

  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const data = await agentApi.getNotifications();
      setNotifications(data);
      const unread = data.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setUnreadCount]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadNotifications(false);
  };

  const handleMarkAllRead = async () => {
    await agentApi.markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleNotificationPress = async (notif: AgentNotification) => {
    if (!notif.isRead) {
      await agentApi.markNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    if (notif.relatedOrderId) {
      router.push(`/orders/${notif.relatedOrderId}`);
    }
  };

  const getNotificationIcon = (type: AgentNotification['type']) => {
    switch (type) {
      case 'ACCEPTED_ORDER':
        return { name: 'bag-check' as const, color: '#059669', bg: '#ECFDF5' };
      case 'COMMISSION_APPROVED':
        return { name: 'shield-checkmark' as const, color: Colors.gold, bg: Colors.goldLight };
      case 'COMMISSION_PAID':
        return { name: 'cash' as const, color: '#2563EB', bg: '#EFF6FF' };
      case 'COMMISSION_CREDITED':
        return { name: 'add-circle' as const, color: Colors.primary, bg: Colors.primaryLight };
      default:
        return { name: 'notifications' as const, color: Colors.textSecondary, bg: Colors.surfaceSubtle };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Notifications"
        subtitle="Order acceptances & financial updates"
        showBack
        rightAction={
          notifications.some((n) => !n.isRead) ? (
            <TouchableOpacity activeOpacity={0.7} onPress={handleMarkAllRead}>
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {isLoading && !isRefreshing ? (
        <LoadingState message="Checking alerts..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadNotifications(true)} />
      ) : (
        <FlatList<AgentNotification>
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const iconConfig = getNotificationIcon(item.type);
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleNotificationPress(item)}
                style={[styles.card, !item.isRead && styles.cardUnread]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
                    <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
                  </View>

                  <View style={styles.titleArea}>
                    <Text style={[styles.title, !item.isRead && styles.titleUnread]}>
                      {item.title}
                    </Text>
                    <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                  </View>

                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                </View>

                <Text style={styles.messageText}>{item.message}</Text>

                {/* Details pill for order notifications */}
                {item.type === 'ACCEPTED_ORDER' && item.orderReference ? (
                  <View style={styles.orderDetailsBox}>
                    <View style={styles.orderDetailRow}>
                      <Text style={styles.orderDetailLabel}>Order Reference:</Text>
                      <Text style={styles.orderDetailVal}>{item.orderReference}</Text>
                    </View>
                    {item.customerName ? (
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Customer:</Text>
                        <Text style={styles.orderDetailVal}>{item.customerName}</Text>
                      </View>
                    ) : null}
                    {item.orderValue != null ? (
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Order Value:</Text>
                        <Text style={styles.orderDetailVal}>{formatETB(item.orderValue)}</Text>
                      </View>
                    ) : null}
                    {item.commissionAmount != null ? (
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Estimated Commission:</Text>
                        <Text style={styles.commissionVal}>
                          +{formatETB(item.commissionAmount)}
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => router.push(`/orders/${item.relatedOrderId}`)}
                      style={styles.viewOrderBtn}
                    >
                      <Text style={styles.viewOrderBtnText}>View Order</Text>
                      <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title="No Notifications"
              message="You will receive alerts here when the Super Admin accepts orders placed by your integrated customers."
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
  markAllText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardUnread: {
    borderColor: Colors.primaryMuted,
    backgroundColor: '#F7FCF8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs + 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  titleUnread: {
    color: Colors.primaryDark,
  },
  timeText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    marginTop: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.xs,
  },
  messageText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  orderDetailsBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  orderDetailLabel: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
  },
  orderDetailVal: {
    fontSize: Typography.fontSize.tiny + 1,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  commissionVal: {
    fontSize: Typography.fontSize.tiny + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  viewOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  viewOrderBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
});
