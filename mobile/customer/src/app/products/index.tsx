import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { MOCK_PRODUCTS } from '@/constants/mockData';
import { Product } from '@/types';
import { AppHeader, Modal } from '@/components/common';
import { ProductGrid } from '@/components/product';
import { useCategories } from '@/hooks/useCategories';
import { productService } from '@/services/productService';
import { t } from '@/utils/i18n';

type SortOption = 'POPULAR' | 'PRICE_LOW' | 'PRICE_HIGH' | 'RATING';

export default function ProductListingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getAllDescendantIds } = useCategories();
  const categoryId = params.categoryId as string;
  const subcategoryId = params.subcategoryId as string;
  const filterType = params.filter as string;
  const title = (params.title as string) || t('categories.all');

  const [sortBy, setSortBy] = useState<SortOption>('POPULAR');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);

  // Live products & loading state
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Origins for filter modal
  const origins = ['Gondar', 'Yirgacheffe', 'Addis Ababa', 'Lalibela'];

  const loadProducts = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const fetched = await productService.fetchProducts({
        categoryId: categoryId || undefined,
        limit: 40,
      });
      if (fetched && fetched.length > 0) {
        setLiveProducts(fetched);
      }
    } catch (err: any) {
      console.warn('[ProductListingScreen] Live fetch notice:', err.message);
      // Fallback seamlessly to mock catalog
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleResetFilters = () => {
    setSelectedOrigin(null);
    setSortBy('POPULAR');
    setFilterModalVisible(false);
  };

  // Filtered & sorted products computation
  const filteredProducts = useMemo(() => {
    let list = liveProducts.length > 0 ? [...liveProducts] : [...MOCK_PRODUCTS];

    if (categoryId) {
      const matchIds = getAllDescendantIds(String(categoryId));
      list = list.filter(
        (p) =>
          matchIds.includes(p.categoryId) ||
          (p.subcategoryId ? matchIds.includes(p.subcategoryId) : false) ||
          p.categoryId === categoryId
      );
    }
    if (subcategoryId) {
      const matchSubIds = getAllDescendantIds(String(subcategoryId));
      list = list.filter(
        (p) =>
          (p.subcategoryId ? matchSubIds.includes(p.subcategoryId) : false) ||
          p.subcategoryId === subcategoryId
      );
    }
    if (filterType === 'deals') {
      list = list.filter((p) => p.isFlashDeal);
    } else if (filterType === 'popular') {
      list = list.filter((p) => p.isPopular);
    }

    if (selectedOrigin) {
      list = list.filter((p) => p.origin && p.origin.toLowerCase().includes(selectedOrigin.toLowerCase()));
    }

    switch (sortBy) {
      case 'PRICE_LOW':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'PRICE_HIGH':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'RATING':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'POPULAR':
      default:
        list.sort((a, b) => b.soldCount - a.soldCount);
        break;
    }

    return list;
  }, [liveProducts, categoryId, subcategoryId, filterType, selectedOrigin, sortBy, getAllDescendantIds]);

  const getSortLabel = () => {
    switch (sortBy) {
      case 'PRICE_LOW':
        return t('search.sort.priceLowHigh');
      case 'PRICE_HIGH':
        return t('search.sort.priceHighLow');
      case 'RATING':
        return t('search.sort.rating');
      case 'POPULAR':
      default:
        return t('search.sort.popular');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header: [Back] Category Name [Search] */}
      <AppHeader
        title={title}
        showBack
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/products/search' as any)}
            accessibilityRole="button"
            accessibilityLabel={t('nav.search') || 'Search'}
            style={styles.searchActionBtn}>
            <Ionicons name="search-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Responsive Filter and Sort Toolbar: [ Filter ] [ Sort ] */}
      <View style={styles.actionToolbar}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setFilterModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('search.filters')}
          style={[styles.actionBtn, selectedOrigin ? styles.actionBtnActive : null]}>
          <Ionicons
            name="funnel-outline"
            size={16}
            color={selectedOrigin ? Colors.primary : Colors.text}
          />
          <Text
            style={[
              styles.actionBtnText,
              selectedOrigin ? styles.actionBtnTextActive : null,
            ]}
            numberOfLines={1}>
            {selectedOrigin ? `${t('search.filters')}: ${selectedOrigin}` : t('search.filters')}
          </Text>
          {selectedOrigin ? (
            <View style={styles.activeFilterDot} />
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setSortModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('search.sort')}
          style={styles.actionBtn}>
          <Ionicons name="swap-vertical" size={16} color={Colors.primary} />
          <Text style={styles.actionBtnText} numberOfLines={1}>
            {t('search.sort')}
          </Text>
          <Text style={styles.sortSubLabel} numberOfLines={1}>
            ({getSortLabel()})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2-Column Responsive Products Grid */}
      <ProductGrid
        products={filteredProducts}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRefresh={handleRefresh}
        onRetry={loadProducts}
        emptyTitle={t('search.noResults')}
        emptyMessage={t('search.noResultsSub')}
        onResetFilters={selectedOrigin || sortBy !== 'POPULAR' ? handleResetFilters : undefined}
      />

      {/* Filter Options Modal */}
      <Modal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        title={t('search.filters')}>
        <View style={styles.modalContent}>
          <Text style={styles.filterSectionTitle}>{t('profile.addresses') || 'Region / Origin'}</Text>
          <View style={styles.filterOptionsGrid}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedOrigin(null)}
              style={[
                styles.filterChip,
                selectedOrigin === null && styles.filterChipActive,
              ]}>
              <Text
                style={[
                  styles.filterChipText,
                  selectedOrigin === null && styles.filterChipTextActive,
                ]}>
                {t('orders.tabAll') || 'All Regions'}
              </Text>
            </TouchableOpacity>

            {origins.map((origin) => {
              const isSelected = selectedOrigin === origin;
              return (
                <TouchableOpacity
                  key={origin}
                  activeOpacity={0.7}
                  onPress={() => setSelectedOrigin(origin)}
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipActive,
                  ]}>
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}>
                    {origin}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.filterModalActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleResetFilters}
              style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>{t('search.resetFilters')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setFilterModalVisible(false)}
              style={styles.applyBtn}>
              <Text style={styles.applyBtnText}>{t('search.applyFilters')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sort Options Modal */}
      <Modal
        visible={sortModalVisible}
        onClose={() => setSortModalVisible(false)}
        title={t('search.sortBy')}>
        {[
          { key: 'POPULAR', label: t('search.sort.popular') },
          { key: 'PRICE_LOW', label: t('search.sort.priceLowHigh') },
          { key: 'PRICE_HIGH', label: t('search.sort.priceHighLow') },
          { key: 'RATING', label: t('search.sort.rating') },
        ].map((opt) => {
          const isSelected = sortBy === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              activeOpacity={0.7}
              onPress={() => {
                setSortBy(opt.key as SortOption);
                setSortModalVisible(false);
              }}
              style={[styles.sortItem, isSelected && styles.sortItemSelected]}>
              <Text style={[styles.sortItemText, isSelected && styles.sortItemTextSelected]}>
                {opt.label}
              </Text>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchActionBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  // Responsive Toolbar [Filter] [Sort]
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
  actionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  actionBtnText: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  actionBtnTextActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  sortSubLabel: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    maxWidth: 80,
  },
  activeFilterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  // Filter Modal
  modalContent: {
    gap: Spacing.md,
  },
  filterSectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
    fontWeight: Typography.fontWeight.bold,
  },
  filterModalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  resetBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  resetBtnText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.medium,
  },
  applyBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  applyBtnText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textInverse,
    fontWeight: Typography.fontWeight.bold,
  },
  // Sort Items
  sortItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  sortItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  sortItemText: {
    fontSize: Typography.fontSize.sm + 1,
    color: Colors.text,
  },
  sortItemTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
});
