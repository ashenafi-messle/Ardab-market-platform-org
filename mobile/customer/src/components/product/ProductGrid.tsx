import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Product } from '@/types';
import { Spacing } from '@/theme';
import { ProductCard } from './ProductCard';
import { LoadingState, EmptyState } from '../common';
import { t } from '@/utils/i18n';

export interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerComponent?: React.ReactElement;
  footerComponent?: React.ReactElement;
  emptyTitle?: string;
  emptyMessage?: string;
  style?: ViewStyle;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  refreshing = false,
  onRefresh,
  headerComponent,
  footerComponent,
  emptyTitle,
  emptyMessage,
  style,
}) => {
  const router = useRouter();

  if (loading && products.length === 0) {
    return (
      <View style={style}>
        {headerComponent}
        <LoadingState type="skeleton-grid" />
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
      columnWrapperStyle={styles.columnWrapper}
      ListHeaderComponent={headerComponent}
      ListFooterComponent={footerComponent}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyState
          icon="basket-outline"
          title={emptyTitle || t('search.noResults')}
          message={emptyMessage || 'Check back later or try adjusting your filters.'}
        />
      }
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          onPress={() => router.push(`/products/${item.id}` as any)}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.huge,
  },
  columnWrapper: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
});
