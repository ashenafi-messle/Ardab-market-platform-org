import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { ArdabLogo } from '../common/ArdabLogo';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { t } from '@/localization';

export const FinalCTA: React.FC = () => {
  const router = useRouter();

  // Slow floating motion for background decorative circle
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 8,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.card}>
      {/* Subtle Logo Watermark in Background */}
      <ArdabLogo watermark size={80} style={styles.watermark} />

      {/* Floating decorative light orb */}
      <Animated.View
        style={[
          styles.decorativeOrb,
          { transform: [{ translateY: floatAnim }] },
        ]}
      />

      <View style={styles.content}>
        <View style={styles.sparkleRow}>
          <Ionicons name="sparkles" size={14} color="#00C853" />
          <Text style={styles.tag}>{t('home.verifiedMarketplace').toUpperCase()}</Text>
        </View>

        <Text style={styles.headline}>{t('home.ctaTitle')}</Text>
        <Text style={styles.subheadline}>
          {t('home.ctaSubtitle')}
        </Text>

        <AnimatedPressable
          scaleTo={0.95}
          accessibilityLabel={t('home.shopNow')}
          onPress={() => router.push('/products' as any)}
          style={styles.ctaButton}>
          <Text style={styles.ctaText}>{t('home.shopNow')}</Text>
          <Ionicons name="arrow-forward" size={16} color="#003B18" />
        </AnimatedPressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    backgroundColor: '#003B18',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 160, 0, 0.3)',
    ...Shadows.md,
  },
  watermark: {
    right: -10,
    bottom: -10,
    opacity: 0.15,
  },
  decorativeOrb: {
    position: 'absolute',
    top: -20,
    left: 20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0, 200, 83, 0.15)',
  },
  content: {
    zIndex: 1,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  tag: {
    fontSize: 10,
    color: '#E6F7E6',
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.8,
  },
  headline: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.heavy,
    color: '#FFFFFF',
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  subheadline: {
    fontSize: 12,
    color: Colors.primaryMuted,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    ...Shadows.sm,
  },
  ctaText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: '#003B18',
  },
});
