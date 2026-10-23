import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors, Radius, Spacing, Shadows } from '@/theme';
import { Product } from '@/types';
import { HomeAdCarousel } from './HomeAdCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface HomeHeroProps {
  heroProducts?: Product[];
  onShopNow?: () => void;
  onExploreCategories?: () => void;
  onCampaignPress?: (campaign: any) => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onCampaignPress,
}) => {
  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  // Full width inside hero card borders
  const heroWidth = SCREEN_WIDTH - Spacing.md * 2;

  return (
    <Animated.View
      style={[
        styles.heroCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}>
      {/* Full-bleed Advertising Carousel fitting completely inside hero section */}
      <HomeAdCarousel containerWidth={heroWidth} onCampaignPress={onCampaignPress} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.xl,
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 160, 0, 0.25)',
    ...Shadows.md,
  },
});

