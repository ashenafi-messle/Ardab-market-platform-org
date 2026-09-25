import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { Product } from '@/types';
import { useApp } from '@/store';
import { t, formatPrice } from '@/utils/i18n';
import { ImagePresets, DEFAULT_BLURHASH } from '@/utils/imageOptimizer';
import { WishlistButton } from './WishlistButton';
import { ProductRating } from './ProductRating';
import { AnimatedPressable } from '../common/AnimatedPressable';

export interface ProductCardProps {
  product: Product;
  onPress: () => void;
  layout?: 'grid' | 'horizontal';
  cardWidth?: number;
  style?: ViewStyle;
}

export const ProductCardComponent: React.FC<ProductCardProps> = ({
  product,
  onPress,
  layout = 'grid',
  cardWidth,
  style,
}) => {
  const { isInWishlist, toggleWishlist, addToCart } = useApp();
  const isFavorite = isInWishlist(product.id);

  const handleAddToCart = (e: any) => {
    e.stopPropagation?.();
    addToCart(product, 1);
  };

  const handleToggleWishlist = (e?: any) => {
    e?.stopPropagation?.();
    toggleWishlist(product);
  };

  if (layout === 'horizontal') {
    return (
      <AnimatedPressable
        scaleTo={0.97}
        onPress={onPress}
        accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
        accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
        style={[styles.horizontalCard, style]}>
        <View style={styles.horizontalImageContainer}>
          <ExpoImage
            source={{ uri: ImagePresets.miniThumbnail(product.images[0]) }}
            style={styles.horizontalImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            placeholder={{ blurhash: DEFAULT_BLURHASH }}
            transition={150}
          />
          {product.discountPercentage ? (
            <View style={styles.discountTag}>
              <Text style={styles.discountText}>-{product.discountPercentage}%</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.horizontalContent}>
          <View style={styles.headerRow}>
            {product.seller?.verified ? (
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />
                <Text style={styles.sellerName} numberOfLines={1}>
                  {product.seller.name}
                </Text>
              </View>
            ) : <View />}
            <WishlistButton
              isFavorite={isFavorite}
              onPress={handleToggleWishlist}
              size={18}
              style={styles.wishlistMini}
            />
          </View>

          <Text style={styles.horizontalTitle} numberOfLines={2}>
            {product.name}
          </Text>

          <ProductRating
            rating={product.rating}
            soldCount={product.soldCount}
            size="sm"
            style={styles.ratingRow}
          />

          <View style={styles.horizontalBottom}>
            <View>
              <Text style={styles.currentPrice}>{formatPrice(product.price)}</Text>
              {product.oldPrice ? (
                <Text style={styles.oldPrice}>{formatPrice(product.oldPrice)}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAddToCart}
              accessibilityRole="button"
              accessibilityLabel={t('product.addToCart')}
              style={styles.addToCartMini}>
              <Ionicons name="cart-outline" size={16} color={Colors.textInverse} />
              <Text style={styles.addToCartMiniText}>{t('product.addToCart')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      scaleTo={0.96}
      onPress={onPress}
      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
      accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
      style={[
        styles.gridCard,
        cardWidth ? { width: cardWidth } : { flex: 1 },
        style,
      ]}>
      {/* Top Image area with consistent 1:1 Aspect Ratio */}
      <View style={styles.imageContainer}>
        <ExpoImage
          source={{ uri: ImagePresets.thumbnail(product.images[0]) }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={{ blurhash: DEFAULT_BLURHASH }}
          transition={150}
        />

        {product.discountPercentage ? (
          <View style={styles.discountTag}>
            <Text style={styles.discountText}>-{product.discountPercentage}%</Text>
          </View>
        ) : null}

        {product.origin ? (
          <View style={styles.originTag}>
            <Ionicons name="location" size={10} color={Colors.textInverse} />
            <Text style={styles.originText} numberOfLines={1}>
              {product.origin.split('/')[0].trim()}
            </Text>
          </View>
        ) : null}

        <View style={styles.wishlistBtnWrapper}>
          <WishlistButton
            isFavorite={isFavorite}
            onPress={handleToggleWishlist}
            size={18}
          />
        </View>
      </View>

      {/* Card Body */}
      <View style={styles.body}>
        {product.seller?.verified ? (
          <View style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />
            <Text style={styles.sellerName} numberOfLines={1}>
              {product.seller.name}
            </Text>
          </View>
        ) : null}

        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>

        <ProductRating
          rating={product.rating}
          soldCount={product.soldCount}
          size="sm"
          style={styles.ratingRow}
        />

        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>{formatPrice(product.price)}</Text>
          {product.oldPrice ? (
            <Text style={styles.oldPrice}>{formatPrice(product.oldPrice)}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAddToCart}
          accessibilityRole="button"
          accessibilityLabel={`${t('product.addToCart')} ${product.name}`}
          style={styles.addToCartButton}>
          <Ionicons name="cart-outline" size={15} color={Colors.textInverse} />
          <Text style={styles.addToCartText}>+ {t('product.addToCart')}</Text>
        </TouchableOpacity>
      </View>
    </AnimatedPressable>
  );
};

export const ProductCard = React.memo(ProductCardComponent);

const styles = StyleSheet.create({
  // Grid Card
  gridCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountTag: {
    position: 'absolute',
    top: Spacing.xs + 2,
    left: Spacing.xs + 2,
    backgroundColor: Colors.ardabRed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    zIndex: 2,
  },
  discountText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
  },
  originTag: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: 'rgba(0, 59, 24, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    maxWidth: '75%',
    zIndex: 2,
  },
  originText: {
    color: Colors.textInverse,
    fontSize: 9,
    fontWeight: Typography.fontWeight.semibold,
  },
  wishlistBtnWrapper: {
    position: 'absolute',
    top: Spacing.xs + 2,
    right: Spacing.xs + 2,
    zIndex: 3,
  },
  body: {
    padding: Spacing.sm,
    justifyContent: 'space-between',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  sellerName: {
    fontSize: 10,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.semibold,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    lineHeight: 18,
    minHeight: 36,
  },
  ratingRow: {
    marginVertical: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    marginVertical: 2,
  },
  currentPrice: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
  oldPrice: {
    fontSize: Typography.fontSize.tiny,
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  addToCartButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: Radius.md,
    gap: 4,
    marginTop: 6,
    minHeight: 34,
  },
  addToCartText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },

  // Horizontal Card
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  horizontalImageContainer: {
    width: 110,
    height: 110,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  horizontalImage: {
    width: '100%',
    height: '100%',
  },
  horizontalContent: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wishlistMini: {
    width: 26,
    height: 26,
  },
  horizontalTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    lineHeight: 18,
    marginTop: 2,
  },
  horizontalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  addToCartMini: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.sm,
    gap: 4,
  },
  addToCartMiniText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
});
