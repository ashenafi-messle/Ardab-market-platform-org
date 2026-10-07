import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { Product } from '@/types';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { t } from '@/localization';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 2:3 aspect ratio of the Cloudinary graphic (1024 x 1536)
const SLOGAN_ASPECT_RATIO = 2 / 3;

// Responsive height calculation:
// Compact phones (~320-360px): ~195-200px
// Standard phones (~375-400px): ~205-220px
// Large phones / tablets (>400px): capped at 235px
const sloganImageHeight = Math.min(Math.max(Math.round(SCREEN_WIDTH * 0.54), 195), 235);
const sloganImageWidth = Math.round(sloganImageHeight * SLOGAN_ASPECT_RATIO);

const HERO_SLOGAN_IMAGE_RAW =
  'https://res.cloudinary.com/dr9umkixr/image/upload/v1791360017/Ardab_Market__Shop_Smart_Live_Better_kitqsw.png';

const OPTIMIZED_SLOGAN_IMAGE_URL =
  getOptimizedImageUrl(HERO_SLOGAN_IMAGE_RAW, {
    width: 600,
    format: 'auto',
  }) || HERO_SLOGAN_IMAGE_RAW;

export interface HomeHeroProps {
  heroProducts?: Product[];
  onShopNow?: () => void;
  onExploreCategories?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onShopNow,
  onExploreCategories,
}) => {
  const router = useRouter();

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  // Subtle floating animation for promotional slogan image
  const floatAnim = useRef(new Animated.Value(0)).current;

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
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 5,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();

    return () => {
      floatLoop.stop();
    };
  }, []);

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
      {/* Background Decorative Shapes */}
      <View style={styles.circleBg1} />
      <View style={styles.circleBg2} />
      <View style={styles.circleBg3} />

      <View style={styles.contentContainer}>
        {/* 1. Hero Heading / Verified Brand Badge: Ardab Market */}
        <View style={styles.tagBadge}>
          <Ionicons name="shield-checkmark" size={13} color={Colors.accent} />
          <Text style={styles.tagText}>Ardab Market</Text>
        </View>

        {/* 2. Large, clearly visible Ardab Market slogan image */}
        <Animated.View
          style={[
            styles.imageWrapper,
            {
              transform: [{ translateY: floatAnim }],
            },
          ]}>
          <ExpoImage
            source={{ uri: OPTIMIZED_SLOGAN_IMAGE_URL }}
            style={styles.sloganImage}
            contentFit="contain"
            priority="high"
            cachePolicy="memory-disk"
            transition={200}
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel="Ardab Market — Shop Smart, Live Better"
          />
        </Animated.View>

        {/* 3. Existing CTA buttons */}
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
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
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
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 160, 0, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.35)',
  },
  tagText: {
    color: '#E6F7E6',
    fontSize: 12,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.3,
  },
  imageWrapper: {
    width: sloganImageWidth,
    height: sloganImageHeight,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  sloganImage: {
    width: '100%',
    height: '100%',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm + 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    ...Shadows.sm,
  },
  primaryBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#003B18',
  },
  secondaryBtn: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  secondaryBtnText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textInverse,
    fontWeight: Typography.fontWeight.semibold,
  },
});
