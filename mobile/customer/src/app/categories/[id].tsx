import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/constants/mockData';
import { Product } from '@/types';
import { productService } from '@/services/productService';
import { useApp } from '@/store';
import { AppHeader, Chip } from '@/components/common';
import { ProductGrid } from '@/components/product';
import { t } from '@/localization';

import { categoryService, CategoryNode } from '@/services/categoryService';
import { useCategories } from '@/hooks/useCategories';

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useApp();
  const { categoryTree } = useCategories();

  const [category, setCategory] = useState<CategoryNode | null>(() => {
    if (id) {
      const fromTree = categoryService.findCategory(categoryTree, id);
      if (fromTree) return fromTree;
    }
    const mockCat = MOCK_CATEGORIES.find((c) => c.id === id) || MOCK_CATEGORIES[0];
    return {
      id: mockCat.id,
      name: mockCat.name,
      nameAmharic: mockCat.nameAmharic,
      slug: mockCat.slug,
      icon: mockCat.icon,
      image: mockCat.image,
      productCount: mockCat.productCount,
      children: mockCat.subcategories.map((s) => ({
        id: s.id,
        name: s.name,
        nameAmharic: s.nameAmharic,
        slug: s.id,
        parentId: mockCat.id,
        productCount: s.productCount,
        children: [],
      })),
    };
  });

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // In-flight request cancellation reference
  const abortControllerRef = React.useRef<AbortController | null>(null);

  useEffect(() => {
    if (id) {
      categoryService.getCategoryById(id).then((cat) => {
        if (cat) setCategory(cat);
      });
    }
  }, [id]);

  const loadProducts = useCallback(async (targetPage = 1, isRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const targetCatId = selectedSubId || id;
    if (!targetCatId) return;

    try {
      if (targetPage === 1 && !isRefresh) {
        setLoading(true);
      } else if (targetPage > 1) {
        setLoadingMore(true);
      }

      const res = await productService.getProducts(
        {
          categoryId: targetCatId,
          page: targetPage,
          limit: 20,
          forceRefresh: isRefresh,
        },
        { signal: controller.signal }
      );

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
      if (err.name === 'AbortError') return;
      console.warn('[CategoryDetailScreen] Live fetch notice:', err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id, selectedSubId]);

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

  const displayName = category
    ? language === 'am' && category.nameAmharic
      ? category.nameAmharic
      : category.name
    : 'Category';

  const subcategories = category?.children || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={displayName}
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

      {/* Subcategory Filter Chips */}
      {subcategories.length > 0 ? (
        <View style={styles.chipsBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}>
            <Chip
              label={t('orders.tabAll')}
              selected={selectedSubId === null}
              onPress={() => setSelectedSubId(null)}
            />
            {subcategories.map((sub) => {
              const subName = language === 'am' && sub.nameAmharic ? sub.nameAmharic : sub.name;
              return (
                <Chip
                  key={sub.id}
                  label={subName}
                  count={sub.productCount}
                  selected={selectedSubId === sub.id}
                  onPress={() => setSelectedSubId(selectedSubId === sub.id ? null : sub.id)}
                />
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Products Grid */}
      <ProductGrid
        products={liveProducts}
        loading={loading && page === 1}
        loadingMore={loadingMore}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onRetry={() => loadProducts(1)}
        onEndReached={handleLoadMore}
        emptyTitle={t('empty.products')}
        emptyMessage={t('search.noResultsSub')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chipsBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.background,
  },
  chipsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
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
});
