import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { MOCK_PRODUCTS } from '@/constants/mockData';
import { Product } from '@/types';
import { AppHeader, Modal, Chip } from '@/components/common';
import { ProductGrid } from '@/components/product';
import { useCategories } from '@/hooks/useCategories';
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
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);

  // Origins for chip filters
  const origins = [t('orders.tabAll'), 'Gondar', 'Yirgacheffe', 'Addis Ababa', 'Lalibela'];

  const filteredProducts = useMemo(() => {
    let list = [...MOCK_PRODUCTS];

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

    if (selectedOrigin && selectedOrigin !== t('orders.tabAll')) {
      list = list.filter((p) => p.origin && p.origin.includes(selectedOrigin));
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
  }, [categoryId, subcategoryId, filterType, selectedOrigin, sortBy]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={title}
        showBack
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/products/search' as any)}
            style={styles.searchActionBtn}>
            <Ionicons name="search-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Filter and Sort Toolbar */}
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}>
          {origins.map((origin) => {
            const isSelected =
              origin === t('orders.tabAll') ? selectedOrigin === null : selectedOrigin === origin;
            return (
              <Chip
                key={origin}
                label={origin}
                selected={isSelected}
                onPress={() => setSelectedOrigin(origin === t('orders.tabAll') ? null : origin)}
              />
            );
          })}
        </ScrollView>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSortModalVisible(true)}
          style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={16} color={Colors.primary} />
          <Text style={styles.sortText}>{t('search.sort')}</Text>
        </TouchableOpacity>
      </View>

      {/* Products Grid */}
      <ProductGrid
        products={filteredProducts}
        emptyTitle={t('empty.products')}
        emptyMessage={t('search.noResultsSub')}
      />

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
                <Ionicons name="checkmark" size={18} color={Colors.primary} />
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
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  chipsScroll: {
    gap: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: Spacing.xs,
  },
  sortText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primaryDark,
  },
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
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  sortItemTextSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
});
