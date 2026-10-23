// ==============================================================================
// Ardab Market - Automatic Home Advertising Carousel
// ==============================================================================
// Production-quality, responsive promotional carousel for the mobile Home hero.
// Features:
// - Seamless auto-rotation every 5 seconds (only when >= 2 slides)
// - Pauses safely on screen blur, app backgrounding, and user gestures
// - Manual swipe with paging and animated pill indicators
// - Optimized Cloudinary CDN caching with next-slide selective preloading
// - Native, accessible high-contrast text overlays in English & Amharic
// - Validated, secure internal route and external link navigation
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  AppState,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
  AccessibilityInfo,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { CampaignItem } from '@/types/campaign';
import { getActiveCampaigns, isValidDestination } from '@/services/campaignService';
import { getOptimizedImageUrl, DEFAULT_BLURHASH } from '@/utils/imageOptimizer';
import { useApp } from '@/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 5-second rotation interval
const AUTO_ROTATE_INTERVAL_MS = 5000;

export interface HomeAdCarouselProps {
  onCampaignPress?: (campaign: CampaignItem) => void;
  containerWidth?: number;
}

export const HomeAdCarousel: React.FC<HomeAdCarouselProps> = ({
  onCampaignPress,
  containerWidth,
}) => {
  const router = useRouter();
  const { language } = useApp();

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isReduceMotion, setIsReduceMotion] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  // Screen focus handling via Expo Router's useFocusEffect
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  const scrollViewRef = useRef<ScrollView>(null);
  const activeSlideRef = useRef(0);
  const isInteractingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Compute slide width to fit perfectly inside the hero card
  const effectiveWidth =
    containerWidth || (SCREEN_WIDTH - Spacing.md * 2);
  const slideHeight = Math.round(effectiveWidth * 0.56);

  // 1. Load active campaigns
  useEffect(() => {
    let isMounted = true;
    getActiveCampaigns().then((items) => {
      if (isMounted) {
        setCampaigns(items);
        // Preload first slide immediately
        if (items[0]?.imageUrl) {
          const firstUrl = getOptimizedImageUrl(items[0].imageUrl, { width: 800 });
          if (firstUrl) ExpoImage.prefetch(firstUrl);
        }
      }
    });

    // Check accessibility reduce-motion setting
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setIsReduceMotion(enabled);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Listen to AppState (pause when app is backgrounded or inactive)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      isPausedRef.current = nextState !== 'active';
    });
    return () => subscription.remove();
  }, []);

  // 3. Automatic rotation loop
  useEffect(() => {
    // Only auto-rotate if there are at least two valid slides and the screen is focused
    if (campaigns.length <= 1 || !isFocused) return;

    const intervalId = setInterval(() => {
      if (
        isInteractingRef.current ||
        isPausedRef.current ||
        AppState.currentState !== 'active'
      ) {
        return;
      }

      const nextIndex = (activeSlideRef.current + 1) % campaigns.length;
      activeSlideRef.current = nextIndex;
      setActiveSlide(nextIndex);

      scrollViewRef.current?.scrollTo({
        x: nextIndex * effectiveWidth,
        animated: !isReduceMotion,
      });

      // Preload subsequent slide image for seamless next transition
      const preloadIndex = (nextIndex + 1) % campaigns.length;
      const nextCampaign = campaigns[preloadIndex];
      if (nextCampaign?.imageUrl) {
        const nextUrl = getOptimizedImageUrl(nextCampaign.imageUrl, { width: 800 });
        if (nextUrl) ExpoImage.prefetch(nextUrl);
      }
    }, AUTO_ROTATE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [campaigns.length, isFocused, effectiveWidth, isReduceMotion]);

  // Handle manual scroll momentum end
  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isInteractingRef.current = false;
      const contentOffsetX = e.nativeEvent.contentOffset.x;
      const slideIndex = Math.round(contentOffsetX / effectiveWidth);

      if (slideIndex >= 0 && slideIndex < campaigns.length) {
        activeSlideRef.current = slideIndex;
        setActiveSlide(slideIndex);
      }
    },
    [effectiveWidth, campaigns.length]
  );

  // Navigate when a slide is tapped
  const handleSlidePress = useCallback(
    (campaign: CampaignItem) => {
      if (onCampaignPress) {
        onCampaignPress(campaign);
        return;
      }

      const { destinationType, destination } = campaign;
      if (!isValidDestination(destinationType, destination)) {
        return;
      }

      if (destinationType === 'internal') {
        router.push(destination as any);
      } else if (destinationType === 'external') {
        Linking.openURL(destination).catch(() => {});
      }
    },
    [onCampaignPress, router]
  );

  if (campaigns.length === 0) {
    return null;
  }

  const isAmharic = language === 'am';

  return (
    <View
      style={[
        styles.carouselContainer,
        { width: effectiveWidth, height: slideHeight },
      ]}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={`Ardab Market advertisement, slide ${activeSlide + 1} of ${campaigns.length}`}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={effectiveWidth}
        snapToAlignment="center"
        scrollEventThrottle={16}
        onTouchStart={() => {
          isInteractingRef.current = true;
        }}
        onTouchEnd={() => {
          isInteractingRef.current = false;
        }}
        onScrollBeginDrag={() => {
          isInteractingRef.current = true;
        }}
        onScrollEndDrag={() => {
          isInteractingRef.current = false;
        }}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={styles.scrollContent}>
        {campaigns.map((campaign, index) => {
          const badge = isAmharic ? campaign.badgeAm : campaign.badge;
          const title = isAmharic ? campaign.titleAm : campaign.title;
          const subtitle = isAmharic ? campaign.subtitleAm : campaign.subtitle;
          const cta = isAmharic ? campaign.ctaTextAm : campaign.ctaText;
          const hasTextOverlay = Boolean(title || subtitle || cta);
          const hasBadge = Boolean(badge);
          const optimizedUri = getOptimizedImageUrl(campaign.imageUrl, {
            width: 800,
            format: 'auto',
          });

          return (
            <TouchableOpacity
              key={campaign.id}
              activeOpacity={0.92}
              onPress={() => handleSlidePress(campaign)}
              style={[styles.slide, { width: effectiveWidth, height: slideHeight }]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={title || `Ardab Market advertisement ${index + 1}`}>
              {/* Campaign Image */}
              <ExpoImage
                source={{ uri: optimizedUri || campaign.imageUrl }}
                style={styles.slideImage}
                contentFit="cover"
                priority={index === 0 ? 'high' : 'normal'}
                cachePolicy="memory-disk"
                placeholder={{ blurhash: DEFAULT_BLURHASH }}
                transition={200}
              />

              {/* Protective Dark Gradient & Tint Scrim only if text overlay is present */}
              {hasTextOverlay ? <View style={styles.imageScrim} /> : null}

              {/* Top Campaign Badge (only if provided) */}
              {hasBadge ? (
                <View style={styles.badgeContainer}>
                  <View style={styles.badgePill}>
                    <Ionicons name="sparkles" size={11} color="#FFD700" />
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                </View>
              ) : null}

              {/* Bottom Native Content Overlay (only if provided) */}
              {hasTextOverlay ? (
                <View style={styles.contentOverlay}>
                  {title ? (
                    <Text style={styles.campaignTitle} numberOfLines={1}>
                      {title}
                    </Text>
                  ) : null}
                  {subtitle ? (
                    <Text style={styles.campaignSubtitle} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  ) : null}
                  {cta ? (
                    <View style={styles.ctaButton}>
                      <Text style={styles.ctaText}>{cta}</Text>
                      <Ionicons name="arrow-forward" size={12} color="#003B18" />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Page Indicators (only rendered if multiple slides exist) */}
      {campaigns.length > 1 ? (
        <View style={styles.indicatorsContainer} pointerEvents="none">
          <View style={styles.indicatorsPill}>
            {campaigns.map((_, idx) => {
              const isActive = idx === activeSlide;
              return (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    isActive ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0a2e16',
    borderWidth: 0,
    alignSelf: 'center',
    marginBottom: 0,
  },
  scrollContent: {
    alignItems: 'center',
  },
  slide: {
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    padding: 0,
  },
  slideImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  imageScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },
  badgeContainer: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    zIndex: 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 45, 18, 0.75)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.3,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'flex-start',
    padding: Spacing.md,
  },
  campaignTitle: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.heavy,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  },
  campaignSubtitle: {
    color: '#E0EAE2',
    fontSize: 11,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: Spacing.xs + 2,
    maxWidth: '92%',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    ...Shadows.sm,
  },
  ctaText: {
    color: '#003B18',
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  indicatorsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  indicatorsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});
