import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Spacing } from '@/theme';
import { Product } from '@/types';
import { SectionHeader } from '../common/SectionHeader';
import { ProductCard } from '../product/ProductCard';
import { t } from '@/localization';

export interface TrendingProductsProps {
  products: Product[];
  title?: string;
}

export const TrendingProducts: React.FC<TrendingProductsProps> = ({
  products,
  title,
}) => {
  const router = useRouter();

  if (!products || products.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title={title || t('home.trending')}
        actionText={t('common.seeAll')}
        onAction={() => router.push('/products?filter=popular' as any)}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {products.map((product) => (
          <View key={product.id} style={styles.cardWrapper}>
            <ProductCard
              product={product}
              onPress={() => router.push(`/products/${product.id}` as any)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  cardWrapper: {
    width: 175,
  },
});
