import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { BRAND_TAGLINE, BRAND_SUPPORTING_TEXT } from '@/constants/branding';
import { Product } from '@/types';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { t, formatPrice } from '@/localization';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface HomeHeroProps {
  heroProducts?: Product[];
  onShopNow?: () => void;
  onExploreCategories?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  heroProducts = [],
  onShopNow,
  onExploreCategories,
}) => {
  const router = useRouter();

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  // Floating decorative element animations
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle continuous floating loop
    const createFloatLoop = (anim: Animated.Value, duration: number, distance: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: -distance,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: distance,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const loop1 = createFloatLoop(floatAnim1, 2400, 6);
    const loop2 = createFloatLoop(floatAnim2, 2800, 5);

    loop1.start();
    loop2.start();

    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, []);

  const prod1 = heroProducts[0];
  const prod2 = heroProducts[1];

  const handleShopNow = () => {
    if (onShopNow) {
      onShopNow();
    } else {
      router.push('/products' as any);
    }
  };

  const handleExplore = () => {
    if (onExploreCategories) {
      onExploreCategories();
    } else {
      router.push('/(tabs)/categories' as any);
    }
  };

  return (
    <Animated.View
      style={[
        styles.heroCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}>
      {/* Background Decorative Circles */}
      <View style={styles.circleBg1} />
      <View style={styles.circleBg2} />
      <View style={styles.circleBg3} />

      <View style={styles.contentRow}>
        {/* Left Column: Text & CTAs */}
        <View style={styles.textColumn}>
          {/* Verified Badge */}
          <View style={styles.tagBadge}>
            <Ionicons name="shield-checkmark" size={13} color={Colors.accent} />
            <Text style={styles.tagText}>{t('home.verifiedMarketplace')}</Text>
          </View>

          <Text style={styles.headline}>{t('home.heroTitle')}</Text>
          <Text style={styles.supporting}>{t('home.heroSubtitle')}</Text>

          {/* Action Buttons */}
          <View style={styles.ctaRow}>
            <AnimatedPressable
              scaleTo={0.94}
              onPress={handleShopNow}
              accessibilityLabel={t('home.shopNow')}
              style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>{t('home.shopNow')}</Text>
              <Ionicons name="arrow-forward" size={14} color="#003B18" />
            </AnimatedPressable>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleExplore}
              accessibilityLabel={t('home.exploreCategories')}
              style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>{t('common.explore')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Column: Floating Product Cards */}
        <View style={styles.productVisualArea}>
          {prod1 ? (
            <Animated.View
              style={[
                styles.floatingCard1,
                { transform: [{ translateY: floatAnim1 }, { rotate: '-6deg' }] },
              ]}>
              <Image
                source={{ uri: prod1.images[0] }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardTag}>
                <Text style={styles.cardTagText} numberOfLines={1}>
                  {prod1.name.split(' ')[0]}
                </Text>
                <Text style={styles.cardPriceText}>{formatPrice(prod1.price)}</Text>
              </View>
            </Animated.View>
          ) : null}

          {prod2 ? (
            <Animated.View
              style={[
                styles.floatingCard2,
                { transform: [{ translateY: floatAnim2 }, { rotate: '5deg' }] },
              ]}>
              <Image
                source={{ uri: prod2.images[0] }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardTag}>
                <Text style={styles.cardTagText} numberOfLines={1}>
                  {prod2.name.split(' ')[0]}
                </Text>
                <Text style={styles.cardPriceText}>{formatPrice(prod2.price)}</Text>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 185,
    borderWidth: 1,
    borderColor: 'rgba(0, 160, 0, 0.25)',
    ...Shadows.md,
  },
  // Abstract background shapes
  circleBg1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(0, 160, 0, 0.2)',
  },
  circleBg2: {
    position: 'absolute',
    bottom: -60,
    right: 50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 200, 83, 0.12)',
  },
  circleBg3: {
    position: 'absolute',
    top: 30,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  textColumn: {
    flex: 1.15,
    paddingRight: Spacing.xs,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 160, 0, 0.28)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.35)',
  },
  tagText: {
    color: '#E6F7E6',
    fontSize: 10,
    fontWeight: Typography.fontWeight.semibold,
  },
  headline: {
    fontSize: Typography.fontSize.xl + 1,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textInverse,
    lineHeight: 25,
    letterSpacing: -0.4,
  },
  supporting: {
    fontSize: 11,
    color: Colors.primaryMuted,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    ...Shadows.sm,
  },
  primaryBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#003B18',
  },
  secondaryBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  secondaryBtnText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textInverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  productVisualArea: {
    flex: 0.85,
    height: 145,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCard1: {
    position: 'absolute',
    top: 5,
    right: 15,
    width: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 3,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  floatingCard2: {
    position: 'absolute',
    bottom: 5,
    right: 2,
    width: 86,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 3,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardImage: {
    width: '100%',
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  cardTag: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  cardTagText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  cardPriceText: {
    fontSize: 8,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primaryDark,
  },
});
