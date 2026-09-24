import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { MOCK_NOTIFICATIONS } from '@/constants/mockData';
import { NotificationItem } from '@/types';
import { AppHeader, EmptyState } from '@/components/common';
import { t } from '@/localization';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'order':
        return <Ionicons name="bicycle" size={20} color={Colors.primary} />;
      case 'promo':
        return <Ionicons name="pricetag" size={20} color={Colors.secondaryAccent} />;
      case 'security':
        return <Ionicons name="shield-checkmark" size={20} color={Colors.success} />;
      default:
        return <Ionicons name="notifications" size={20} color={Colors.primary} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('nav.notifications')}
        showBack
        rightAction={
          notifications.length > 0 ? (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markReadText}>{t('common.done')}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => toggleRead(item.id)}
            style={[styles.itemCard, !item.read && styles.itemUnread]}>
            <View style={styles.iconCircle}>{getIcon(item.type)}</View>

            <View style={styles.contentCol}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !item.read && styles.titleBold]} numberOfLines={1}>
                  {item.title}
                </Text>
                {!item.read ? <View style={styles.unreadDot} /> : null}
              </View>

              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{item.createdAt}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title={t('empty.notifications')}
            message={t('home.specialOffers')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  markReadText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  itemUnread: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryMuted,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
  titleBold: {
    fontWeight: Typography.fontWeight.bold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  body: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginVertical: 2,
  },
  time: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
