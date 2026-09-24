import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppButton, ArdabLogo, LanguageSwitcher } from '@/components/common';
import { useAuth, maskIdentity } from '@/context/AuthContext';
import { useApp } from '@/store';
import { t } from '@/localization';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();
  const { language } = useApp();
  const { savedIdentity, isAuthenticated } = useAuth();

  useEffect(() => {
    // Hide native splash screen immediately when landing screen mounts
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar with Brand and Language Switcher */}
      <View style={styles.topBar}>
        <View style={styles.topBrand}>
          <ArdabLogo size="sm" />
          <View style={styles.brandTitleCol}>
            <Text style={styles.topBrandName}>{t('common.appName')}</Text>
            <Text style={styles.topBrandMotto}>ጥራትና አስተማማኝነት</Text>
          </View>
        </View>
        <LanguageSwitcher compact />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Hero Visual Card with Verified Marketplace Overlay */}
        <View style={styles.heroCard}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroGradient}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#FFD700" />
              <Text style={styles.verifiedBadgeText}>
                {t('home.verifiedMarketplace')}
              </Text>
            </View>
            <Text style={styles.heroTagline}>
              {t('home.heroTitle')}
            </Text>
          </View>
        </View>

        {/* Promotion Texts & Description */}
        <View style={styles.promoSection}>
          <Text style={styles.promoTitle}>{t('auth.welcome')}</Text>
          <Text style={styles.promoSubtitle}>
            {t('auth.welcomeSubtitle')}
          </Text>

          {/* Value Propositions / Promotion Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <View style={styles.featureIconBubble}>
                <Ionicons name="checkmark-done-circle" size={20} color={Colors.primary} />
              </View>
              <View style={styles.featureMeta}>
                <Text style={styles.featureTitle}>{t('home.benefit1Title')}</Text>
                <Text style={styles.featureDesc}>{t('home.benefit1Desc')}</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBubble}>
                <Ionicons name="bicycle" size={20} color={Colors.primary} />
              </View>
              <View style={styles.featureMeta}>
                <Text style={styles.featureTitle}>{t('home.benefit2Title')}</Text>
                <Text style={styles.featureDesc}>{t('home.benefit2Desc')}</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBubble}>
                <Ionicons name="card-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.featureMeta}>
                <Text style={styles.featureTitle}>{t('home.benefit3Title')}</Text>
                <Text style={styles.featureDesc}>{t('home.benefit3Desc')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Returning User Quick Greeting if device has saved account */}
        {savedIdentity && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/login' as any)}
            style={styles.returningCard}>
            <View style={styles.returningIcon}>
              <Ionicons name="person-circle" size={22} color={Colors.primary} />
            </View>
            <View style={styles.returningTextCol}>
              <Text style={styles.returningGreeting}>{t('auth.welcomeBackUser')}</Text>
              <Text style={styles.returningIdentity}>{maskIdentity(savedIdentity)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Bottom Call-to-Actions */}
        <View style={styles.actionsSection}>
          <AppButton
            title={t('auth.getStarted')}
            size="lg"
            variant="primary"
            onPress={() => router.push('/(auth)/register' as any)}
            style={styles.mainBtn}
          />

          <AppButton
            title={t('auth.signIn')}
            size="lg"
            variant="outline"
            onPress={() => router.push('/(auth)/login' as any)}
            style={styles.mainBtn}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.replace('/(tabs)' as any)}
            style={styles.guestLink}>
            <Text style={styles.guestLinkText}>
              {t('auth.continue')} • {t('categories.browseProducts')}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    backgroundColor: '#FFFFFF',
  },
  topBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandTitleCol: {
    justifyContent: 'center',
  },
  topBrandName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  topBrandMotto: {
    fontSize: 10,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.medium,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  heroCard: {
    width: '100%',
    height: Math.min(SCREEN_HEIGHT * 0.28, 230),
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginTop: Spacing.md,
    position: 'relative',
    ...Shadows.md,
    backgroundColor: Colors.surface,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 48, 36, 0.55)',
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 168, 89, 0.88)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.2,
  },
  heroTagline: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.heavy,
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  promoSection: {
    paddingVertical: Spacing.md,
  },
  promoTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  promoSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  featuresContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  featureIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureMeta: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  featureDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 1,
  },
  returningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  returningIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returningTextCol: {
    flex: 1,
  },
  returningGreeting: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  returningIdentity: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  actionsSection: {
    width: '100%',
    paddingTop: Spacing.sm,
  },
  mainBtn: {
    marginBottom: Spacing.xs + 4,
  },
  guestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  guestLinkText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
});

