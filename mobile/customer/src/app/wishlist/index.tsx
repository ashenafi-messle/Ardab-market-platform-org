import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { t } from '@/localization';
import { AppHeader, EmptyState } from '@/components/common';
import { ProductCard } from '@/components/product';
import { Product } from '@/types';

type FilterTab = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK';

export default function WishlistScreen() {
  const router = useRouter();
  const { wishlistProducts, toggleWishlist, refreshWishlist, isAuthenticated } = useApp();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    refreshWishlist()
      .catch(() => {})
      .finally(() => {
        if (isMounted) setInitialLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshWishlist();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemove = async (product: Product) => {
    await toggleWishlist(product);
  };

  const filteredItems = wishlistProducts.filter((product) => {
    if (!product) return false;
    if (activeTab === 'ALL') return true;
    if (activeTab === 'IN_STOCK') return (product.stock ?? 50) > 0;
    if (activeTab === 'OUT_OF_STOCK') return (product.stock ?? 0) <= 0;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('profile.wishlist')} showBack />

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('ALL')}
          style={[styles.tab, activeTab === 'ALL' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
            {t('orders.tabAll')} ({wishlistProducts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('IN_STOCK')}
          style={[styles.tab, activeTab === 'IN_STOCK' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'IN_STOCK' && styles.tabTextActive]}>
            {t('product.inStock')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('OUT_OF_STOCK')}
          style={[styles.tab, activeTab === 'OUT_OF_STOCK' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'OUT_OF_STOCK' && styles.tabTextActive]}>
            {t('product.outOfStock')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {initialLoading && wishlistProducts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading wishlist...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.itemWrapper}>
              <View style={styles.cardContainer}>
                <ProductCard
                  product={item}
                  layout="horizontal"
                  onPress={() => router.push(`/products/${item.id}` as any)}
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.removeBtn}
                accessibilityLabel="Remove from wishlist"
                onPress={() => handleRemove(item)}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={t('wishlist.empty') || 'Your wishlist is empty.'}
              message={t('wishlist.emptySub') || 'Explore fresh local items and tap the heart icon to save products.'}
              actionTitle={t('cart.startShopping') || 'Explore Products'}
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.huge,
  },
  itemWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  cardContainer: {
    flex: 1,
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fee2e2',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
