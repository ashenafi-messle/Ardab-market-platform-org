import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { SectionHeader } from '../common/SectionHeader';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { t } from '@/localization';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface OfferBanner {
  id: string;
  badge: string;
  discount: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkFilter: string;
}

export const SpecialOffers: React.FC = () => {
  const router = useRouter();

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

  const offers: OfferBanner[] = [
    {
      id: 'offer-1',
      badge: 'LIMITED TIME',
      discount: 'UP TO 40% OFF',
      title: 'Ethiopian New Harvest',
      subtitle: 'Pure Gojjam Magna Teff & Yirgacheffe Coffee',
      imageUrl:
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
      linkFilter: 'deals',
    },
    {
      id: 'offer-2',
      badge: 'PRODUCER DIRECT',
      discount: '25% OFF',
      title: 'Authentic Sheba Tibeb',
      subtitle: 'Handcrafted Habesha Kemis & cotton Netela',
      imageUrl:
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=400&q=80',
      linkFilter: 'deals',
    },
    {
      id: 'offer-3',
      badge: 'ENERGY DEALS',
      discount: 'SAVE 30%',
      title: 'Solar & Emergency Power',
      subtitle: 'Heavy duty powerbanks & rechargeable lamps',
      imageUrl:
        'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=400&q=80',
      linkFilter: 'deals',
    },
  ];

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
        {offers.map((offer) => (
          <AnimatedPressable
            key={offer.id}
            scaleTo={0.97}
            accessibilityLabel={offer.title}
            onPress={() => router.push(`/products?filter=${offer.linkFilter}` as any)}
            style={styles.card}>
            {/* Animated Glow Border */}
            <Animated.View style={[styles.glowBackground, { opacity: glowAnim }]} />

            <View style={styles.innerCard}>
              {/* Left Content */}
              <View style={styles.textContainer}>
                <View style={styles.badgeRow}>
                  <View style={styles.redBadge}>
                    <Text style={styles.redBadgeText}>{offer.discount}</Text>
                  </View>
                  <Text style={styles.badgeLabel}>{offer.badge}</Text>
                </View>

                <Text style={styles.cardTitle}>{offer.title}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={2}>
                  {offer.subtitle}
                </Text>

                <View style={styles.shopNowBtn}>
                  <Text style={styles.shopNowText}>{t('home.shopNow')}</Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                </View>
              </View>

              {/* Right Image */}
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: offer.imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              </View>
            </View>
          </AnimatedPressable>
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
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 330),
    height: 146,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.md,
  },
  glowBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#00C853',
    borderRadius: Radius.xl,
  },
  innerCard: {
    flex: 1,
    margin: 1.5,
    borderRadius: Radius.xl - 1,
    backgroundColor: '#003B18',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1.2,
    justifyContent: 'space-between',
    paddingRight: Spacing.xs,
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
    borderRadius: 4,
  },
  redBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: Typography.fontWeight.heavy,
  },
  badgeLabel: {
    color: '#E6F7E6',
    fontSize: 9,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 11,
    color: Colors.primaryMuted,
    lineHeight: 15,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingVertical: 5,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  shopNowText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  imageWrapper: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
});
