import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
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

  // Live products, pagination & loading state
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In-flight request cancellation reference
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Origins for filter modal
  const origins = ['Gondar', 'Yirgacheffe', 'Addis Ababa', 'Lalibela'];

  const getBackendSort = (sort: SortOption): string => {
    switch (sort) {
      case 'PRICE_LOW':
        return 'price_asc';
      case 'PRICE_HIGH':
        return 'price_desc';
      case 'RATING':
        return 'rating';
      case 'POPULAR':
      default:
        return 'popular';
    }
  };

  const loadProducts = useCallback(async (targetPage = 1, isRefresh = false) => {
    // Abort previous in-flight request if user quickly changed category or sort
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (targetPage === 1 && !isRefresh) {
        setLoading(true);
      } else if (targetPage > 1) {
        setLoadingMore(true);
      }
      setError(null);

      const targetCategoryId = subcategoryId || categoryId || undefined;
      let res;
      if (filterType === 'deals') {
        res = await productService.getSpecialOffers(
          {
            page: targetPage,
            limit: 20,
            forceRefresh: isRefresh,
          },
          { signal: controller.signal }
        );
      } else {
        res = await productService.getProducts(
          {
            categoryId: targetCategoryId,
            sort: getBackendSort(sortBy),
            page: targetPage,
            limit: 20,
            forceRefresh: isRefresh,
          },
          { signal: controller.signal }
        );
      }

      if (targetPage === 1) {
        setLiveProducts(res.items);
      } else {
        setLiveProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = res.items.filter((item) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }

      setPage(res.pagination.page);
      setHasNextPage(Boolean(res.pagination.hasNext || res.pagination.hasNextPage));
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Obsolete request cancelled cleanly
        return;
      }
      console.warn('[ProductListingScreen] Live fetch notice:', err.message);
      if (targetPage === 1) {
        setError(err.message || 'Failed to load products');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categoryId, subcategoryId, sortBy, filterType]);

  useEffect(() => {
    setPage(1);
    setHasNextPage(true);
    loadProducts(1);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts(1, true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasNextPage) {
      loadProducts(page + 1);
    }
  };

  const handleResetFilters = () => {
    setSelectedOrigin(null);
    setSortBy('POPULAR');
    setFilterModalVisible(false);
  };

  // Filtered products computation for client-only filters (origin, deals, popular flag)
  const filteredProducts = useMemo(() => {
    let list = [...liveProducts];

    if (filterType === 'deals') {
      list = list.filter((p) => p.isFlashDeal || (p.discountPercentage && p.discountPercentage > 0));
    } else if (filterType === 'popular') {
      list = list.filter((p) => p.isPopular);
    }

    if (selectedOrigin) {
      list = list.filter((p) => p.origin && p.origin.toLowerCase().includes(selectedOrigin.toLowerCase()));
    }

    return list;
  }, [liveProducts, filterType, selectedOrigin]);

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
        loading={loading && page === 1}
        loadingMore={loadingMore}
        refreshing={refreshing}
        error={error}
        onRefresh={handleRefresh}
        onRetry={() => loadProducts(1)}
        onEndReached={handleLoadMore}
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
