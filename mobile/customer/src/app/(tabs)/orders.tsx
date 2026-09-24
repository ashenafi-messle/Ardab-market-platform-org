import React, { useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { useApp } from '@/store';
import { OrderStatusType } from '@/types';
import { t } from '@/utils/i18n';
import { OrderCard } from '@/components/order';
import { EmptyState } from '@/components/common';

type FilterTab = 'ALL' | 'TO_PAY' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

export default function OrdersScreen() {
  const router = useRouter();
  const { orders, language } = useApp();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'ALL', label: t('orders.tabAll') },
    { key: 'SHIPPING', label: t('orders.tabShipping') },
    { key: 'PROCESSING', label: t('orders.tabProcessing') },
    { key: 'DELIVERED', label: t('orders.tabDelivered') },
    { key: 'TO_PAY', label: t('orders.tabToPay') },
    { key: 'CANCELLED', label: t('orders.tabCancelled') },
  ];

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'TO_PAY') return order.paymentStatus === 'PENDING';
    return order.status === activeTab;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('orders.title')}</Text>
      </View>

      {/* Filter Tabs Bar */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}>
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab.key)}
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
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => router.push(`/orders/${item.id}` as any)}
            onTrackPress={() => router.push(`/orders/tracking?id=${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bag-handle-outline"
            title={t('orders.noOrders')}
            message={t('orders.noOrdersSub')}
            actionTitle={t('cart.startShopping')}
            onAction={() => router.push('/(tabs)' as any)}
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
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
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
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
    paddingBottom: Spacing.huge,
  },
});
