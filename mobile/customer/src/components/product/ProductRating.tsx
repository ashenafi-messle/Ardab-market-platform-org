import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/theme';
import { t } from '@/utils/i18n';

export interface ProductRatingProps {
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const ProductRating: React.FC<ProductRatingProps> = ({
  rating,
  reviewCount,
  soldCount,
  size = 'sm',
  style,
}) => {
  const iconSize = size === 'sm' ? 12 : 16;
  const hasRating = rating !== undefined && rating > 0;

  if (!hasRating && (!soldCount || soldCount <= 0)) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {hasRating ? (
        <>
          <View style={styles.starRow}>
            <Ionicons name="star" size={iconSize} color={Colors.secondaryAccent} />
            <Text style={[styles.ratingText, styles[`text_${size}`]]}>{rating.toFixed(1)}</Text>
          </View>

          {reviewCount !== undefined && reviewCount > 0 ? (
            <Text style={[styles.secondaryText, styles[`text_${size}`]]}>
              ({reviewCount})
            </Text>
          ) : null}
        </>
      ) : null}

      {soldCount !== undefined && soldCount > 0 ? (
        <>
          {hasRating ? <Text style={styles.dot}>•</Text> : null}
          <Text style={[styles.secondaryText, styles[`text_${size}`]]}>
            {soldCount} {t('product.sold')}
          </Text>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  secondaryText: {
    color: Colors.textSecondary,
    marginLeft: 3,
  },
  dot: {
    marginHorizontal: Spacing.xs,
    color: Colors.textMuted,
    fontSize: 10,
  },
  text_sm: {
    fontSize: Typography.fontSize.tiny,
  },
  text_md: {
    fontSize: Typography.fontSize.sm,
  },
});
