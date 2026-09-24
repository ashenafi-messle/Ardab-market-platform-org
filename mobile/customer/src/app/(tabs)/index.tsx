import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '@/theme';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/constants/mockData';
import { Product, Category } from '@/types';
import { useApp } from '@/store';
import { t } from '@/localization';
import {
  HomeHeader,
  HomeHero,
  CategoryCarousel,
  SpecialOffers,
  TrendingProducts,
  RecommendedProducts,
  MarketplaceBenefits,
  FinalCTA,
  HomeSkeleton,
} from '@/components/home';
import { CategoryDrawer } from '@/components/categories';

export default function HomeScreen() {
  const router = useRouter();
  const { language } = useApp();

  // Sidebar drawer state
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);

  // State management for independent section loading & resilience
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [allProducts, setAllProducts] = useState<Product[]>(MOCK_PRODUCTS);

  // Trending & Recommended subsets
  const trendingProducts = allProducts.filter((p) => p.isPopular || p.isFlashDeal);
  const recommendedProducts = allProducts.filter((p) => p.isRecommended || !p.isPopular);
  const heroProducts = allProducts.slice(0, 2);

  const loadData = async () => {
    try {
      setErrorState(null);
      // In this phase mock/cached data is loaded reliably without blocking
      setCategories(MOCK_CATEGORIES);
      setAllProducts(MOCK_PRODUCTS);
    } catch {
      setErrorState(t('errors.general'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} key={language}>
      {/* A. Top App Header with Category Drawer trigger */}
      <HomeHeader
        onSearchPress={() => router.push('/products/search' as any)}
        onLogoPress={() => setIsCategoryDrawerOpen(true)}
        hasUnreadNotifications
      />

      {/* Category Sidebar Drawer */}
      <CategoryDrawer
        visible={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
      />

      {/* Main Scrollable Marketplace Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }>
        {/* Error notification banner if any */}
        {errorState ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{errorState}</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* B. Hero / Promotional Area with Floating Cards */}
        {loadingProducts ? (
          <HomeSkeleton type="hero" />
        ) : (
          <HomeHero
            heroProducts={heroProducts}
            onShopNow={() => router.push('/products' as any)}
            onExploreCategories={() => router.push('/(tabs)/categories' as any)}
          />
        )}

        {/* C. Quick Category Section */}
        {loadingCategories ? (
          <HomeSkeleton type="categories" />
        ) : (
          <CategoryCarousel categories={categories} />
        )}

        {/* D. Special Offers Section with Animated Glow */}
        <SpecialOffers />

        {/* E. Trending Products Carousel */}
        {loadingProducts ? (
          <HomeSkeleton type="products" />
        ) : (
          <TrendingProducts
            products={trendingProducts}
            title={t('home.trending')}
          />
        )}

        {/* G. Marketplace Benefits / Trust Badges */}
        <MarketplaceBenefits />

        {/* F. Recommended Products 2-Column Grid */}
        {loadingProducts ? (
          <HomeSkeleton type="products" />
        ) : (
          <RecommendedProducts
            products={recommendedProducts}
            title={t('home.recommended')}
          />
        )}

        {/* H. Final Promotional CTA with Logo Watermark */}
        <FinalCTA />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: Spacing.huge,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },
  retryBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.sm,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.error,
  },
});
