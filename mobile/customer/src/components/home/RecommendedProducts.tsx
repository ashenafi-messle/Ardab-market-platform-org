import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Spacing } from '@/theme';
import { Product } from '@/types';
import { SectionHeader } from '../common/SectionHeader';
import { ProductCard } from '../product/ProductCard';
import { t } from '@/localization';

export interface RecommendedProductsProps {
  products: Product[];
  title?: string;
}

export const RecommendedProducts: React.FC<RecommendedProductsProps> = ({
  products,
  title,
}) => {
  const router = useRouter();

  if (!products || products.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title={title || t('home.recommended')}
        actionText={t('common.seeAll')}
        onAction={() => router.push('/products' as any)}
      />

      <View style={styles.grid}>
        {products.map((product) => (
          <View key={product.id} style={styles.gridItem}>
            <ProductCard
              product={product}
              onPress={() => router.push(`/products/${product.id}` as any)}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  gridItem: {
    width: '47.5%',
  },
});
