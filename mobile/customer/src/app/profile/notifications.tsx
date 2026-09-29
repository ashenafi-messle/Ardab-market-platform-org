// ==============================================================================
// Ardab Market - Mobile Customer Notification Center
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { NotificationItem, NotificationType } from '@/types';
import { AppHeader, EmptyState } from '@/components/common';
import { t } from '@/localization';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/services/notificationService';

type FilterTab = 'ALL' | 'UNREAD';

/**
 * Format timestamp to friendly relative time
 */
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Load initial notifications
  const loadNotifications = useCallback(
    async (page = 1, showSpinner = true) => {
      if (showSpinner) setIsLoading(true);
      try {
        const isUnreadFilter = activeTab === 'UNREAD';
        const [notifRes, count] = await Promise.all([
          fetchNotifications({ page, limit: 20, unread: isUnreadFilter }),
          fetchUnreadCount(),
        ]);

        if (page === 1) {
          setNotifications(notifRes.notifications);
        } else {
          setNotifications((prev) => [...prev, ...notifRes.notifications]);
        }

        setUnreadCount(count);
        setCurrentPage(page);
        setHasMore(notifRes.pagination.hasNextPage);
      } catch (err) {
        console.warn('[Notifications] Failed to load notifications:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    loadNotifications(1, true);
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications(1, false);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      setIsLoadingMore(true);
      loadNotifications(currentPage + 1, false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.warn('[Notifications] Failed to mark all read:', err);
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // 1. Optimistically mark as read in local state
    if (!item.isRead && !item.read) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, read: true, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationAsRead(item.id).catch(() => {});
    }

    // 2. Navigate based on deep link or entity
    const targetLink =
      item.deepLink ||
      (item.entityType === 'PRODUCT' && item.entityId
        ? `/products/${item.entityId}`
        : null) ||
      (item.entityType === 'ORDER' && item.entityId
        ? `/orders/${item.entityId}`
        : null);

    if (targetLink) {
      try {
        router.push(targetLink as any);
      } catch (e) {
        console.warn('[Notifications] Failed to route to target:', targetLink);
      }
    }
  };

  const getNotificationBadge = (type: NotificationType) => {
    switch (type) {
      case 'NEW_PRODUCT':
        return {
          icon: 'sparkles' as const,
          color: '#F59E0B',
          bg: '#FEF3C7',
          label: 'New Arrival',
        };
      case 'PRODUCT_DISCOUNT':
      case 'PROMOTION':
      case 'promo':
        return {
          icon: 'pricetag' as const,
          color: Colors.secondaryAccent,
          bg: '#FEE2E2',
          label: 'Special Offer',
        };
      case 'ORDER_PLACED':
      case 'ORDER_CONFIRMED':
      case 'ORDER_PROCESSING':
      case 'ORDER_PACKED':
      case 'ORDER_OUT_FOR_DELIVERY':
      case 'ORDER_DELIVERED':
      case 'ORDER_CANCELLED':
      case 'order':
        return {
          icon: 'cube-outline' as const,
          color: Colors.primary,
          bg: Colors.primaryLight,
          label: 'Order Update',
        };
      case 'SUPPORT':
        return {
          icon: 'chatbubbles' as const,
          color: '#0D9488',
          bg: '#CCFBF1',
          label: 'Support',
        };
      case 'SECURITY':
      case 'security':
        return {
          icon: 'shield-checkmark' as const,
          color: Colors.success,
          bg: '#DCFCE7',
          label: 'Security',
        };
      default:
        return {
          icon: 'notifications' as const,
          color: Colors.primary,
          bg: Colors.primaryLight,
          label: 'System',
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('nav.notifications')}
        showBack
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markReadAllBtn}>
              <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
              <Text style={styles.markReadText}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ALL' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ALL')}
          activeOpacity={0.8}>
          <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'UNREAD' && styles.tabButtonActive]}
          onPress={() => setActiveTab('UNREAD')}
          activeOpacity={0.8}>
          <Text style={[styles.tabText, activeTab === 'UNREAD' && styles.tabTextActive]}>
            Unread
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => `${item.id}_${item.recipientId || ''}`}
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
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const badge = getNotificationBadge(item.type);
            const isUnread = !item.read && !item.isRead;

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleNotificationPress(item)}
                style={[styles.itemCard, isUnread && styles.itemUnread]}>
                {/* Notification Icon or Image */}
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.productThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.iconCircle, { backgroundColor: badge.bg }]}>
                    <Ionicons name={badge.icon} size={20} color={badge.color} />
                  </View>
                )}

                <View style={styles.contentCol}>
                  <View style={styles.titleRow}>
                    <View style={styles.badgeLabelContainer}>
                      <Text style={[styles.badgeLabel, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
                  </View>

                  <Text
                    style={[styles.title, isUnread && styles.titleBold]}
                    numberOfLines={2}>
                    {item.title}
                  </Text>

                  <Text style={styles.body} numberOfLines={3}>
                    {item.body}
                  </Text>
                </View>

                {/* Unread Blue Indicator Dot */}
                {isUnread && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title={activeTab === 'UNREAD' ? 'No unread notifications' : t('empty.notifications')}
              message={
                activeTab === 'UNREAD'
                  ? "You're all caught up! There are no unread notifications right now."
                  : 'You have no notifications yet. When new products or order updates arrive, you will see them here.'
              }
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
  markReadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  markReadText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  badgePill: {
    backgroundColor: Colors.secondaryAccent,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.huge,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  itemUnread: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumbnail: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  contentCol: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    lineHeight: 18,
    marginBottom: 2,
  },
  titleBold: {
    fontWeight: Typography.fontWeight.bold,
    color: '#0F172A',
  },
  body: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
    marginLeft: 6,
  },
  footerLoader: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
