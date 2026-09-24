import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/constants/mockData';
import { Product } from '@/types';
import { productService } from '@/services/productService';
import { useApp } from '@/store';
import { AppHeader, Chip } from '@/components/common';
import { ProductGrid } from '@/components/product';
import { t } from '@/localization';

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useApp();

  const category = MOCK_CATEGORIES.find((c) => c.id === id) || MOCK_CATEGORIES[0];
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (id) {
      productService.fetchProducts({ categoryId: id }).then((items) => {
        if (items && items.length > 0) {
          setLiveProducts(items);
        }
      });
    }
  }, [id]);

  const displayName = language === 'am' && category.nameAmharic ? category.nameAmharic : category.name;

  const categoryProducts = useMemo(() => {
    const sourceList = liveProducts.length > 0 ? liveProducts : MOCK_PRODUCTS;
    return sourceList.filter((p) => {
      const matchesCat = p.categoryId === category.id || (liveProducts.length > 0 && p.categoryId === id);
      if (!matchesCat) return false;
      if (selectedSubId) {
        return p.subcategoryId === selectedSubId;
      }
      return true;
    });
  }, [category.id, id, selectedSubId, liveProducts]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={displayName} showBack />

      {/* Subcategory Filter Chips */}
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
          {category.subcategories.map((sub) => {
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

      {/* Products Grid */}
      <ProductGrid
        products={categoryProducts}
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
});
