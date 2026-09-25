import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ViewStyle,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/types';
import { Colors, Radius, Spacing, Typography } from '@/theme';
import { ProductCard } from './ProductCard';
import { EmptyState } from '../common/EmptyState';
import { t } from '@/utils/i18n';

export interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onRetry?: () => void;
  headerComponent?: React.ReactElement;
  footerComponent?: React.ReactElement;
  emptyTitle?: string;
  emptyMessage?: string;
  onResetFilters?: () => void;
  style?: ViewStyle;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  refreshing = false,
  error = null,
  onRefresh,
  onRetry,
  headerComponent,
  footerComponent,
  emptyTitle,
  emptyMessage,
  onResetFilters,
  style,
}) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  // Dynamic responsive grid metrics
  const horizontalPadding = screenWidth < 360 ? 10 : Spacing.md;
  const columnGap = screenWidth < 360 ? 8 : 12;
  const availableWidth = screenWidth - horizontalPadding * 2 - columnGap;
  const cardWidth = Math.floor(availableWidth / 2);

  // Skeletons for loading state
  const skeletonCards = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => (
      <View
        key={`skeleton-${i}`}
        style={[
          styles.skeletonCard,
          { width: cardWidth, marginBottom: columnGap },
        ]}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonBody}>
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonLineFull} />
          <View style={styles.skeletonLineHalf} />
        </View>
      </View>
    ));
  }, [cardWidth, columnGap]);

  // Loading state when initial products are empty
  if (loading && products.length === 0) {
    return (
      <View style={[styles.root, style]}>
        {headerComponent}
        <View
          style={[
            styles.skeletonGrid,
            { paddingHorizontal: horizontalPadding, gap: columnGap },
          ]}>
          {skeletonCards}
        </View>
      </View>
    );
  }

  // Error state
  if (error && products.length === 0) {
    return (
      <View style={[styles.errorContainer, { paddingHorizontal: horizontalPadding }, style]}>
        {headerComponent}
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
          <Text style={styles.errorTitle}>
            {error || t('errors.general') || 'Failed to load products'}
          </Text>
          {onRetry ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry loading products"
              style={styles.retryButton}>
              <Ionicons name="refresh" size={16} color={Colors.textInverse} />
              <Text style={styles.retryText}>{t('common.retry') || 'Retry'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        { paddingHorizontal: horizontalPadding },
        style,
      ]}
      columnWrapperStyle={[
        styles.columnWrapper,
        { gap: columnGap, marginBottom: columnGap },
      ]}
      ListHeaderComponent={headerComponent}
      ListFooterComponent={footerComponent}
      initialNumToRender={6}
      maxToRenderPerBatch={8}
      windowSize={7}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        ) : undefined
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="basket-outline"
            title={emptyTitle || t('search.noResults')}
            message={
              emptyMessage ||
              t('empty.noProductsMatching') ||
              'No products match your current selection. Try adjusting filters.'
            }
          />
          {onResetFilters ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onResetFilters}
              style={styles.resetFiltersBtn}>
              <Text style={styles.resetFiltersBtnText}>
                {t('search.resetFilters') || 'Reset Filters'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          cardWidth={cardWidth}
          onPress={() => router.push(`/products/${item.id}` as any)}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    paddingBottom: Spacing.huge,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  // Skeletons
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  skeletonCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
  },
  skeletonBody: {
    padding: Spacing.sm,
    gap: 6,
  },
  skeletonLineShort: {
    width: '40%',
    height: 10,
    borderRadius: Radius.xs,
    backgroundColor: Colors.borderLight,
  },
  skeletonLineFull: {
    width: '90%',
    height: 12,
    borderRadius: Radius.xs,
    backgroundColor: Colors.borderLight,
  },
  skeletonLineHalf: {
    width: '60%',
    height: 14,
    borderRadius: Radius.xs,
    backgroundColor: Colors.borderLight,
  },
  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  errorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  retryText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  // Empty
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  resetFiltersBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  resetFiltersBtnText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});
