import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing } from '@/theme';
import { formatPrice } from '@/utils/i18n';
import { DiscountBadge } from './DiscountBadge';

export interface ProductPriceProps {
  price: number;
  oldPrice?: number;
  discountPercentage?: number;
  size?: 'sm' | 'md' | 'lg';
  showDiscountBadge?: boolean;
  style?: ViewStyle;
}

export const ProductPrice: React.FC<ProductPriceProps> = ({
  price,
  oldPrice,
  discountPercentage,
  size = 'md',
  showDiscountBadge = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.priceRow}>
        <Text style={[styles.currentPrice, styles[`price_${size}`]]}>
          {formatPrice(price)}
        </Text>
        {oldPrice && oldPrice > price ? (
          <Text style={[styles.oldPrice, styles[`oldPrice_${size}`]]}>
            {formatPrice(oldPrice)}
          </Text>
        ) : null}
      </View>
      {showDiscountBadge && discountPercentage ? (
        <DiscountBadge percentage={discountPercentage} style={styles.badge} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  currentPrice: {
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
  price_sm: {
    fontSize: Typography.fontSize.base,
  },
  price_md: {
    fontSize: Typography.fontSize.lg,
  },
  price_lg: {
    fontSize: Typography.fontSize.xxl,
  },
  oldPrice: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.regular,
  },
  oldPrice_sm: {
    fontSize: Typography.fontSize.tiny,
  },
  oldPrice_md: {
    fontSize: Typography.fontSize.xs,
  },
  oldPrice_lg: {
    fontSize: Typography.fontSize.base,
  },
  badge: {
    marginTop: 2,
  },
});
