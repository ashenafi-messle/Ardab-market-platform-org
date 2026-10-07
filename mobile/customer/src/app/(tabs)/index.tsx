import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '@/theme';
import { Product, Category } from '@/types';
import { homeService, HomeLatestOrder } from '@/services/homeService';
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

const ACTIVE_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_DELIVERY',
  'ASSIGNED_TO_TRIP',
  'PICKED_UP',
  'IN_TRANSIT',
];

export default function HomeScreen() {
  const router = useRouter();
  const {
    language,
    currentCity,
    cartItems,
    syncCartWithValidatedProducts,
    syncWishlistIdsFromHome,
  } = useApp();

  // Sidebar drawer state
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);

  // Initial cached state check to avoid initial flashing
  const initialCache = homeService.getMemoryCachedHome();

  // Loading states
  const [loadingInitial, setLoadingInitial] = useState<boolean>(!initialCache);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  // Guard against concurrent refresh operations (double pull / rapid gestures)
  const isRefreshingRef = useRef<boolean>(false);

  // Marketplace section states
  const [categories, setCategories] = useState<Category[]>(initialCache?.categories || []);
  const [specialOffers, setSpecialOffers] = useState<Product[]>(initialCache?.specialOffers || []);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>(initialCache?.trendingProducts || []);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>(initialCache?.recommendedProducts || []);
  const [heroProducts, setHeroProducts] = useState<Product[]>(initialCache?.heroProducts || []);
  const [unreadCount, setUnreadCount] = useState<number>(initialCache?.unreadNotificationCount || 0);
  const [latestOrder, setLatestOrder] = useState<HomeLatestOrder | null>(initialCache?.latestOrder || null);

  /**
   * Applies freshly fetched Home data to all dependent UI sections atomically
   */
  const applyHomeData = useCallback(
    (data: any) => {
      if (!data) return;

      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
      if (Array.isArray(data.specialOffers)) {
        setSpecialOffers(data.specialOffers);
      }
      if (Array.isArray(data.trendingProducts)) {
        setTrendingProducts(data.trendingProducts);
      }
      if (Array.isArray(data.recommendedProducts)) {
        setRecommendedProducts(data.recommendedProducts);
      }
      if (Array.isArray(data.heroProducts) && data.heroProducts.length > 0) {
        setHeroProducts(data.heroProducts);
      } else if (Array.isArray(data.trendingProducts)) {
        setHeroProducts(data.trendingProducts.slice(0, 2));
      }

      setUnreadCount(Number(data.unreadNotificationCount || 0));
      setLatestOrder(data.latestOrder || null);

      // Sync customer wishlist IDs if provided
      if (Array.isArray(data.wishlistProductIds)) {
        syncWishlistIdsFromHome(data.wishlistProductIds);
      }

      // Sync and validate prices for items currently in customer's cart
      if (Array.isArray(data.cartValidation) && data.cartValidation.length > 0) {
        const { priceChanged, outOfStockChanged } = syncCartWithValidatedProducts(data.cartValidation);
        if (priceChanged) {
          setCartNotice(
            language === 'am'
              ? 'በጋሪዎ ውስጥ ያሉ አንዳንድ ዕቃዎች ወቅታዊ ዋጋ ተዘምኗል'
              : 'Some items in your cart had price updates.'
          );
        } else if (outOfStockChanged) {
          setCartNotice(
            language === 'am'
              ? 'በጋሪዎ ውስጥ ያሉ አንዳንድ ዕቃዎች በአሁኑ ወቅት አልቀዋል'
              : 'Some items in your cart are currently out of stock.'
          );
        }
      }
    },
    [language, syncCartWithValidatedProducts, syncWishlistIdsFromHome]
  );

  /**
   * Dedicated initial data loader for when the app is opened.
   * Completely decoupled from the pull-to-refresh feature.
   */
  const loadInitialData = useCallback(async () => {
    try {
      setErrorState(null);

      const cartProductIds = (cartItems || []).map((item) => item.product.id).filter(Boolean);

      const data = await homeService.fetchInitialHomeData({
        city: currentCity,
        cartProductIds,
      });

      applyHomeData(data);
    } catch (err: any) {
      // Keep existing UI intact, only show lightweight error if we have no cached data at all
      if (categories.length === 0 && trendingProducts.length === 0) {
        setErrorState(
          language === 'am'
            ? 'የገበያውን መረጃ ማግኘት አልተቻለም። እባክዎ ወደ ታች ስበው እንደገና ይሞክሩ።'
            : "Couldn't load the latest marketplace data. Pull down to try again."
        );
      }
    } finally {
      setLoadingInitial(false);
    }
  }, [applyHomeData, cartItems, categories.length, currentCity, language, trendingProducts.length]);

  // Restore persisted offline cache on cold start for instantaneous rendering, then fetch initial data
  useEffect(() => {
    let isMounted = true;

    homeService.getPersistedHomeData().then((persisted) => {
      if (isMounted && persisted && categories.length === 0) {
        applyHomeData(persisted);
        setLoadingInitial(false);
      }
    });

    // Fetch initial home data on app open (independent of refresh)
    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [loadInitialData]);

  /**
   * Native Pull-To-Refresh handler
   * Guarantees:
   * - ONLY updates data to latest when customer explicitly performs refresh on Home
   * - Native refresh spinner
   * - Does NOT reset or blank the screen
   * - Existing data remains visible during refresh
   * - Deduplication against repeated gestures
   */
  const handleRefresh = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setRefreshing(true);
    setErrorState(null);
    setCartNotice(null);

    const refreshStartTime = Date.now();
    console.log('[HomeRefresh] Customer initiated pull-to-refresh');

    try {
      const cartProductIds = (cartItems || []).map((item) => item.product.id).filter(Boolean);

      const freshData = await homeService.refreshHomeData({
        city: currentCity,
        cartProductIds,
      });

      applyHomeData(freshData);
      console.log(`[HomeRefresh] Pull-to-refresh finished in ${Date.now() - refreshStartTime}ms`);
    } catch (err: any) {
      console.warn('[HomeRefresh] Pull-to-refresh error:', err?.message);
      // Keep existing data visible, show friendly lightweight notification
      setErrorState(
        language === 'am'
          ? 'ማደስ አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
          : "Couldn't refresh. Please try again."
      );
    } finally {
      isRefreshingRef.current = false;
      setRefreshing(false);
    }
  };

  const hasActiveOrder = latestOrder && ACTIVE_ORDER_STATUSES.includes(latestOrder.status);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} key={language}>
      {/* A. Top App Header with Category Drawer trigger */}
      <HomeHeader
        onSearchPress={() => router.push('/products/search' as any)}
        onLogoPress={() => setIsCategoryDrawerOpen(true)}
        hasUnreadNotifications={unreadCount > 0}
      />

      {/* Official Slogan Trust Bar */}
      <View style={styles.sloganBar}>
        <Ionicons name="sparkles" size={13} color={Colors.accent} />
        <Text style={styles.sloganText} numberOfLines={1}>
          {language === 'am' ? '“ጥራትና ታማኝነት፣ እስከ ቤትዎ ድረስ!”' : '“Quality and Trust, Delivered to Your Door!”'}
        </Text>
        <Ionicons name="shield-checkmark" size={13} color={Colors.primary} />
      </View>

      {/* Category Sidebar Drawer */}
      <CategoryDrawer
        visible={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
      />

      {/* Main Scrollable Marketplace Area with Native Pull-To-Refresh */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
            title={refreshing ? (language === 'am' ? 'በማደስ ላይ...' : 'Refreshing...') : undefined}
            titleColor={Colors.textMuted}
          />
        }>
        {/* Lightweight Non-blocking Error Banner */}
        {errorState ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{errorState}</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Lightweight Cart Price Update Notice */}
        {cartNotice ? (
          <View style={styles.noticeBanner}>
            <Ionicons name="information-circle" size={16} color={Colors.primary} />
            <Text style={styles.noticeText}>{cartNotice}</Text>
            <TouchableOpacity onPress={() => setCartNotice(null)}>
              <Ionicons name="close" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Live Active Order Tracking Card if customer has an ongoing order */}
        {hasActiveOrder && latestOrder ? (
          <TouchableOpacity
            style={styles.activeOrderCard}
            activeOpacity={0.85}
            onPress={() => router.push(`/orders/${latestOrder.id}` as any)}>
            <View style={styles.orderIconBox}>
              <Ionicons name="bicycle" size={20} color={Colors.primary} />
            </View>
            <View style={styles.orderInfo}>
              <View style={styles.orderHeaderRow}>
                <Text style={styles.orderNumberText}>
                  Order #{latestOrder.orderNumber}
                </Text>
                <View style={styles.orderStatusBadge}>
                  <Text style={styles.orderStatusBadgeText}>
                    {latestOrder.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderDeliveryText} numberOfLines={1}>
                {latestOrder.estimatedDelivery || (language === 'am' ? 'ትዕዛዝዎ በሂደት ላይ ነው' : 'In transit to delivery address')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}

        {/* B. Hero / Promotional Area with Floating Cards */}
        {loadingInitial && heroProducts.length === 0 ? (
          <HomeSkeleton type="hero" />
        ) : (
          <HomeHero
            heroProducts={heroProducts}
            onShopNow={() => router.push('/products' as any)}
            onExploreCategories={() => router.push('/(tabs)/categories' as any)}
          />
        )}

        {/* C. Quick Category Section (Live DB images from Super Admin products) */}
        {loadingInitial && categories.length === 0 ? (
          <HomeSkeleton type="categories" />
        ) : (
          <CategoryCarousel categories={categories} />
        )}

        {/* D. Special Offers Section (Authoritative Backend Discount Rules) */}
        <SpecialOffers products={specialOffers} />

        {/* E. Trending Products Carousel */}
        {loadingInitial && trendingProducts.length === 0 ? (
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
        {loadingInitial && recommendedProducts.length === 0 ? (
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
  sloganBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#D1E7DD',
  },
  sloganText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    letterSpacing: 0.2,
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
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  noticeText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.medium,
  },
  activeOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E0E7E1',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  orderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  orderNumberText: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  orderStatusBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  orderStatusBadgeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  orderDeliveryText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
