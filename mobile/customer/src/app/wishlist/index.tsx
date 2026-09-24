import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { useApp } from '@/store';
import { t } from '@/localization';
import { AppHeader, EmptyState } from '@/components/common';
import { ProductCard } from '@/components/product';

type FilterTab = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK';

export default function WishlistScreen() {
  const router = useRouter();
  const { wishlistProducts, language } = useApp();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const filteredItems = wishlistProducts.filter((product) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'IN_STOCK') return product.stock > 0;
    if (activeTab === 'OUT_OF_STOCK') return product.stock <= 0;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('profile.wishlist')} showBack />

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('ALL')}
          style={[styles.tab, activeTab === 'ALL' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
            {t('orders.tabAll')} ({wishlistProducts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('IN_STOCK')}
          style={[styles.tab, activeTab === 'IN_STOCK' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'IN_STOCK' && styles.tabTextActive]}>
            {t('product.inStock')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('OUT_OF_STOCK')}
          style={[styles.tab, activeTab === 'OUT_OF_STOCK' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'OUT_OF_STOCK' && styles.tabTextActive]}>
            {t('product.outOfStock')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            layout="horizontal"
            onPress={() => router.push(`/products/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title={t('wishlist.empty')}
            message={t('wishlist.emptySub')}
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
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
