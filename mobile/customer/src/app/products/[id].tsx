import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Share,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { MOCK_PRODUCTS } from '@/constants/mockData';
import { Product } from '@/types';
import { productService } from '@/services/productService';
import { useApp } from '@/store';
import { t, formatPrice } from '@/utils/i18n';
import { ImagePresets, DEFAULT_BLURHASH } from '@/utils/imageOptimizer';
import { ProductRating, DiscountBadge, ProductCard } from '@/components/product';
import { QuantitySelector, AppButton, Divider } from '@/components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isInWishlist, toggleWishlist, addToCart } = useApp();

  const [product, setProduct] = useState<Product>(() => {
    if (id) {
      const fromCache = productService.getProductFromCache(id);
      if (fromCache) return fromCache;
      const fromMock = MOCK_PRODUCTS.find((p) => p.id === id);
      if (fromMock) return fromMock;
    }
    return MOCK_PRODUCTS[0];
  });

  useEffect(() => {
    if (id) {
      productService.fetchProductById(id).then((found) => {
        if (found) setProduct(found);
      });
    }
  }, [id]);

  const isFavorite = isInWishlist(product.id);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (product.attributes) {
      Object.entries(product.attributes).forEach(([key, options]) => {
        if (options && options.length > 0) {
          initial[key] = options[0];
        }
      });
    }
    return initial;
  });
  const [addedToast, setAddedToast] = useState(false);

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedAttributes);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedAttributes);
    router.push('/checkout' as any);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.name} on Ardab Market for ${formatPrice(product.price)}!`,
      });
    } catch {}
  };

  // Related products from same category
  const relatedProducts = MOCK_PRODUCTS.filter(
    (p) => p.categoryId === product.categoryId && p.id !== product.id
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.navActions}>
          <TouchableOpacity onPress={handleShare} style={styles.navBtn}>
            <Ionicons name="share-social-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/cart' as any)}
            style={styles.navBtn}>
            <Ionicons name="cart-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Image Gallery */}
        <View style={styles.imageGalleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIndex(slide);
            }}
            scrollEventThrottle={16}>
            {product.images.map((imgUri, index) => (
              <View key={index} style={styles.imageSlide}>
                <ExpoImage
                  source={{ uri: ImagePresets.detail(imgUri) }}
                  style={styles.productImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  placeholder={{ blurhash: DEFAULT_BLURHASH }}
                  transition={200}
                />
              </View>
            ))}
          </ScrollView>

          {/* Dots Indicator */}
          {product.images.length > 1 ? (
            <View style={styles.dotsContainer}>
              {product.images.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    activeImageIndex === idx && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}

          {product.discountPercentage ? (
            <View style={styles.discountBadgeWrapper}>
              <DiscountBadge percentage={product.discountPercentage} />
            </View>
          ) : null}
        </View>

        {/* Product Info Section */}
        <View style={styles.infoSection}>
          {/* Category Ancestry Path Breadcrumb */}
          {product.categoryPath && product.categoryPath.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.breadcrumbBar}>
              {product.categoryPath.map((item, index) => {
                const isLast = index === product.categoryPath!.length - 1;
                return (
                  <View key={item.id} style={styles.breadcrumbItemWrap}>
                    <TouchableOpacity
                      disabled={isLast}
                      onPress={() =>
                        router.push(
                          `/products?categoryId=${item.id}&title=${encodeURIComponent(item.name)}` as any
                        )
                      }
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.breadcrumbText,
                          isLast && styles.breadcrumbTextActive,
                        ]}
                        numberOfLines={1}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                    {!isLast ? (
                      <Ionicons
                        name="chevron-forward"
                        size={12}
                        color={Colors.textSecondary}
                        style={styles.breadcrumbChevron}
                      />
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          ) : product.categoryName ? (
            <View style={styles.breadcrumbBar}>
              <Text style={styles.breadcrumbText}>{product.categoryName}</Text>
              {product.subcategoryName ? (
                <>
                  <Ionicons
                    name="chevron-forward"
                    size={12}
                    color={Colors.textSecondary}
                    style={styles.breadcrumbChevron}
                  />
                  <Text style={[styles.breadcrumbText, styles.breadcrumbTextActive]}>
                    {product.subcategoryName}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceText}>{formatPrice(product.price)}</Text>
              {product.oldPrice ? (
                <Text style={styles.oldPriceText}>{formatPrice(product.oldPrice)}</Text>
              ) : null}
            </View>

            <View style={styles.stockBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.stockText}>{t('product.inStock')}</Text>
            </View>
          </View>

          <Text style={styles.titleText}>{product.name}</Text>

          {/* Ratings & Sold Stats */}
          <View style={styles.statsRow}>
            <ProductRating
              rating={product.rating}
              reviewCount={product.reviewCount}
              soldCount={product.soldCount}
              size="md"
            />
            {product.origin ? (
              <View style={styles.originTag}>
                <Ionicons name="location-outline" size={12} color={Colors.primary} />
                <Text style={styles.originText}>{product.origin}</Text>
              </View>
            ) : null}
          </View>

          <Divider spacing="md" />

          {/* Dynamic Attribute Selectors (if present) */}
          {product.attributes ? (
            <View style={styles.attributesSection}>
              {Object.entries(product.attributes).map(([attrName, options]) => (
                <View key={attrName} style={styles.attrGroup}>
                  <Text style={styles.attrTitle}>
                    {attrName}:{' '}
                    <Text style={styles.attrValueSelected}>{selectedAttributes[attrName]}</Text>
                  </Text>
                  <View style={styles.attrOptionsRow}>
                    {options.map((opt) => {
                      const isSelected = selectedAttributes[attrName] === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          activeOpacity={0.8}
                          onPress={() =>
                            setSelectedAttributes((prev) => ({ ...prev, [attrName]: opt }))
                          }
                          style={[
                            styles.attrOptionBtn,
                            isSelected && styles.attrOptionBtnSelected,
                          ]}>
                          <Text
                            style={[
                              styles.attrOptionText,
                              isSelected && styles.attrOptionTextSelected,
                            ]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              <Divider spacing="md" />
            </View>
          ) : null}

          {/* Quantity Row */}
          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>{t('product.quantity')}</Text>
            <QuantitySelector
              quantity={quantity}
              onIncrease={() => setQuantity((q) => q + 1)}
              onDecrease={() => setQuantity((q) => (q > 1 ? q - 1 : 1))}
              size="md"
            />
          </View>

          <Divider spacing="md" />

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={styles.sectionHeading}>{t('product.description')}</Text>
            <Text style={styles.descText}>{product.description}</Text>
          </View>

          <Divider spacing="md" />

          {/* Seller Profile Card */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerTop}>
              <View style={styles.sellerIcon}>
                <Ionicons name="storefront" size={24} color={Colors.primary} />
              </View>
              <View style={styles.sellerDetails}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{product.seller.name}</Text>
                  {product.seller.verified ? (
                    <View style={styles.verifiedPill}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />
                      <Text style={styles.verifiedPillText}>{t('common.verified')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.sellerCity}>{product.seller.city}, Ethiopia</Text>
              </View>
            </View>

            <View style={styles.sellerMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>★ {product.seller.rating.toFixed(1)}</Text>
                <Text style={styles.metricLabel}>{t('product.rating')}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{product.seller.salesCount}+</Text>
                <Text style={styles.metricLabel}>{t('nav.orders')}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{product.seller.responseRate || '98%'}</Text>
                <Text style={styles.metricLabel}>{t('common.verified')}</Text>
              </View>
            </View>
          </View>

          {/* Delivery & Assurance Info */}
          <View style={styles.deliveryAssuranceCard}>
            <View style={styles.deliveryItem}>
              <Ionicons name="bicycle-outline" size={20} color={Colors.primary} />
              <View style={styles.deliveryTextCol}>
                <Text style={styles.deliveryTitle}>{t('product.deliveryInfo')}</Text>
                <Text style={styles.deliveryDesc}>{t('home.benefit2Desc')}</Text>
              </View>
            </View>
            <View style={styles.deliveryItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              <View style={styles.deliveryTextCol}>
                <Text style={styles.deliveryTitle}>{t('home.benefit1Title')}</Text>
                <Text style={styles.deliveryDesc}>{t('home.benefit1Desc')}</Text>
              </View>
            </View>
          </View>

          {/* Related Products */}
          {relatedProducts.length > 0 ? (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionHeading}>{t('product.relatedProducts')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedScroll}>
                {relatedProducts.map((p) => (
                  <View key={p.id} style={styles.relatedCardWrapper}>
                    <ProductCard
                      product={p}
                      onPress={() => router.push(`/products/${p.id}` as any)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Added to cart toast */}
      {addedToast ? (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.textInverse} />
          <Text style={styles.toastText}>{t('product.addedToCart')}</Text>
        </View>
      ) : null}

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleWishlist(product)}
          style={[styles.wishlistBarBtn, isFavorite && styles.wishlistBarBtnActive]}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite ? Colors.error : Colors.text}
          />
        </TouchableOpacity>

        <AppButton
          title={t('product.addToCart')}
          variant="outline"
          size="md"
          onPress={handleAddToCart}
          style={styles.barAddToCartBtn}
        />

        <AppButton
          title={t('product.buyNow')}
          variant="primary"
          size="md"
          onPress={handleBuyNow}
          style={styles.barBuyNowBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  imageGalleryContainer: {
    width: '100%',
    height: 320,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  imageSlide: {
    width: SCREEN_WIDTH,
    height: 320,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 20,
  },
  discountBadgeWrapper: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  infoSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  priceText: {
    fontSize: Typography.fontSize.hero - 6,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
  oldPriceText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  stockText: {
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.success,
  },
  titleText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    lineHeight: 24,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  originTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  originText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.semibold,
  },
  attributesSection: {
    marginVertical: Spacing.xs,
  },
  attrGroup: {
    marginBottom: Spacing.md,
  },
  attrTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  attrValueSelected: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  attrOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  attrOptionBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  attrOptionBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  attrOptionText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
  },
  attrOptionTextSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  quantityLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  descSection: {
    paddingVertical: Spacing.xs,
  },
  sectionHeading: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  descText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sellerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  sellerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sellerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerDetails: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  verifiedPillText: {
    fontSize: 9,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  sellerCity: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sellerMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.borderLight,
  },
  deliveryAssuranceCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  deliveryTextCol: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  deliveryDesc: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  relatedSection: {
    marginTop: Spacing.md,
  },
  relatedScroll: {
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  relatedCardWrapper: {
    width: 180,
  },
  toast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    ...Shadows.md,
  },
  toastText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  wishlistBarBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  wishlistBarBtnActive: {
    borderColor: Colors.errorLight,
    backgroundColor: Colors.errorLight,
  },
  barAddToCartBtn: {
    flex: 1,
  },
  barBuyNowBtn: {
    flex: 1,
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
    gap: 4,
  },
  breadcrumbItemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  breadcrumbTextActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  breadcrumbChevron: {
    marginHorizontal: 2,
  },
});
