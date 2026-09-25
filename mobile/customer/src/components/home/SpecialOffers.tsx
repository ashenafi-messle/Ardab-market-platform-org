import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { Product } from '@/types';
import { SectionHeader } from '../common/SectionHeader';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { t, formatPrice } from '@/localization';
import { productService } from '@/services/productService';
import { ImagePresets, DEFAULT_BLURHASH } from '@/utils/imageOptimizer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SpecialOffersProps {
  products?: Product[];
}

export const SpecialOffers: React.FC<SpecialOffersProps> = ({ products: initialProducts }) => {
  const router = useRouter();
  const [offers, setOffers] = useState<Product[]>(initialProducts || []);
  const [loading, setLoading] = useState<boolean>(!initialProducts);

  // Subtle animated glow pulse
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.85,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (initialProducts) {
      setOffers(initialProducts.filter((p) => p.discountPercentage && p.discountPercentage > 0));
      setLoading(false);
      return;
    }

    let isMounted = true;
    productService
      .getSpecialOffers({ limit: 10 })
      .then((res) => {
        if (isMounted) {
          setOffers(res.items || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOffers([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialProducts]);

  // If loading or zero discounted products: Hide section completely (NO demo data, NO fake products)
  if (loading || offers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title={t('home.specialOffers')}
        badge="Hot"
        badgeColor={Colors.ardabRed}
        actionText={t('common.seeAll')}
        onAction={() => router.push('/products?filter=deals' as any)}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {offers.map((product) => {
          const discountText = product.discountPercentage
            ? `${product.discountPercentage}% OFF`
            : 'DISCOUNT';
          const imageUrl = product.images?.[0] || product.primaryImage?.url || '';

          return (
            <AnimatedPressable
              key={product.id}
              scaleTo={0.97}
              accessibilityLabel={`${product.name} - ${discountText}`}
              onPress={() => router.push(`/products/${product.id}` as any)}
              style={styles.card}>
              {/* Animated Glow Border */}
              <Animated.View style={[styles.glowBackground, { opacity: glowAnim }]} />

              <View style={styles.innerCard}>
                {/* Left Content */}
                <View style={styles.textContainer}>
                  <View style={styles.badgeRow}>
                    <View style={styles.redBadge}>
                      <Text style={styles.redBadgeText}>{discountText}</Text>
                    </View>
                    <Text style={styles.badgeLabel}>
                      {product.seller?.city || 'Direct Platform'}
                    </Text>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {product.name}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>{formatPrice(product.price)}</Text>
                    {product.oldPrice && product.oldPrice > product.price ? (
                      <Text style={styles.oldPrice}>{formatPrice(product.oldPrice)}</Text>
                    ) : null}
                  </View>

                  <View style={styles.shopNowBtn}>
                    <Text style={styles.shopNowText}>{t('home.shopNow')}</Text>
                    <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                  </View>
                </View>

                {/* Right Image */}
                <View style={styles.imageWrapper}>
                  {imageUrl ? (
                    <ExpoImage
                      source={{ uri: ImagePresets.thumbnail(imageUrl) }}
                      style={styles.productImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      placeholder={{ blurhash: DEFAULT_BLURHASH }}
                      transition={150}
                    />
                  ) : (
                    <View style={styles.placeholderBox}>
                      <Ionicons name="pricetag-outline" size={36} color={Colors.primaryDark} />
                    </View>
                  )}
                </View>
              </View>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  card: {
    width: SCREEN_WIDTH * 0.82,
    maxWidth: 340,
    borderRadius: Radius.lg,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
  },
  glowBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.ardabRed,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  innerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    padding: Spacing.sm,
  },
  textContainer: {
    flex: 1,
    paddingRight: Spacing.xs,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  redBadge: {
    backgroundColor: Colors.ardabRed,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  redBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.2,
  },
  badgeLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.medium,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  oldPrice: {
    fontSize: 11,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    gap: 4,
  },
  shopNowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: Typography.fontWeight.semibold,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#F3F6F4',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6F4',
  },
});
