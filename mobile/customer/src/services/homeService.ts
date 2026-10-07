// ==============================================================================
// Ardab Market - Mobile Customer Consolidated Home Service
// ==============================================================================
// - Centralized data fetching for the entire customer mobile Home screen
// - Fetches consolidated /customer-mobile/home (with /customer/home fallback) in 1 roundtrip
// - Native pull-to-refresh coordination with request deduplication
// - Offline/fast cache persistence in secureStorage
// - Stale-time cooldown handling for screen focus vs explicit user pull
// - Structured debug logging (duration, success, failure) without sensitive data
// ==============================================================================

import { apiFetch } from '@/constants/api';
import { secureStorage } from '@/services/secureStorage';
import { mapBackendProductToMobile } from '@/services/productService';
import { Category, Product } from '@/types';

export interface HomeLatestOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  placedAt: string;
  estimatedDelivery?: string | null;
  deliveryStatus?: string | null;
}

export interface HomeCartValidationProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  discountPercent?: number;
  hasDiscount: boolean;
  status: string;
  isAvailable: boolean;
  cityAvailability: string[];
  primaryImage?: string | null;
}

export interface HomeCustomerProfile {
  id: string;
  fullName: string;
  city?: string | null;
  profileImageUrl?: string | null;
}

export interface HomeData {
  categories: Category[];
  specialOffers: Product[];
  trendingProducts: Product[];
  recommendedProducts: Product[];
  heroProducts: Product[];
  unreadNotificationCount: number;
  latestOrder: HomeLatestOrder | null;
  wishlistProductIds: string[];
  customer: HomeCustomerProfile | null;
  cartValidation: HomeCartValidationProduct[];
  serverTimestamp: string;
}

const STORAGE_HOME_CACHE_KEY = 'ardab_cached_home_data';
const HOME_STALE_TIME_MS = 60 * 1000; // 60 seconds stale-while-revalidate cooldown for screen focus

import { resolveCategoryIcon } from '@/utils/categoryIcon';

export function mapNodeToCategory(node: any): Category {
  const imgUrl = (node.latestProductImage || node.imageUrl || node.image || '').trim();
  return {
    id: node.id,
    name: node.name,
    nameAmharic: node.nameAmharic,
    slug: node.slug || node.id,
    icon: resolveCategoryIcon(node.icon, 'grid-outline'),
    image: imgUrl,
    imageUrl: imgUrl || undefined,
    productCount: node.productCount || 0,
    subcategories: (node.children || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      nameAmharic: c.nameAmharic,
      image: (c.latestProductImage || c.imageUrl || c.image || '').trim(),
      productCount: c.productCount || 0,
    })),
  };
}

class HomeService {
  private inMemoryCache: HomeData | null = null;
  private lastFetchedTimestamp: number = 0;
  private inFlightInitialPromise: Promise<HomeData> | null = null;
  private inFlightRefreshPromise: Promise<HomeData> | null = null;

  /**
   * Retrieves synchronous in-memory cached Home data if present
   */
  public getMemoryCachedHome(): HomeData | null {
    return this.inMemoryCache;
  }

  /**
   * Fast load of persisted Home data from secureStorage
   */
  public async getPersistedHomeData(): Promise<HomeData | null> {
    if (this.inMemoryCache) return this.inMemoryCache;

    try {
      const raw = await secureStorage.getItem(STORAGE_HOME_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.categories)) {
          this.inMemoryCache = parsed;
          return parsed;
        }
      }
    } catch {
      // Non-critical cache read failure
    }
    return null;
  }

  /**
   * Checks whether the current Home data is fresh enough
   */
  public isFresh(): boolean {
    return (
      this.inMemoryCache !== null &&
      Date.now() - this.lastFetchedTimestamp < HOME_STALE_TIME_MS
    );
  }

  /**
   * Parses raw consolidated backend payload into the strongly-typed HomeData structure
   */
  private parseHomePayload(payload: any): HomeData {
    // Map categories tree
    const rawCategories = Array.isArray(payload.categories) ? payload.categories : [];
    const mappedCategories = rawCategories.map(mapNodeToCategory);

    // Map product lists using authoritative mobile product mapper
    const rawOffers = Array.isArray(payload.specialOffers) ? payload.specialOffers : [];
    const specialOffers = rawOffers
      .map(mapBackendProductToMobile)
      .filter((p: Product) => p.discountPercentage && p.discountPercentage > 0);

    const rawTrending = Array.isArray(payload.trendingProducts) ? payload.trendingProducts : [];
    const trendingProducts = rawTrending.map(mapBackendProductToMobile);

    const rawRecommended = Array.isArray(payload.recommendedProducts) ? payload.recommendedProducts : [];
    const recommendedProducts = rawRecommended.map(mapBackendProductToMobile);

    const rawHero =
      Array.isArray(payload.heroProducts) && payload.heroProducts.length > 0
        ? payload.heroProducts.map(mapBackendProductToMobile)
        : trendingProducts.slice(0, 2);

    return {
      categories: mappedCategories,
      specialOffers,
      trendingProducts,
      recommendedProducts,
      heroProducts: rawHero,
      unreadNotificationCount: Number(payload.unreadNotificationCount || 0),
      latestOrder: payload.latestOrder || null,
      wishlistProductIds: Array.isArray(payload.wishlistProductIds) ? payload.wishlistProductIds : [],
      customer: payload.customer || null,
      cartValidation: Array.isArray(payload.cartValidation) ? payload.cartValidation : [],
      serverTimestamp: payload.serverTimestamp || new Date().toISOString(),
    };
  }

  /**
   * Initial data fetch for when the customer opens the app.
   * Completely separated from the refresh feature.
   */
  public async fetchInitialHomeData(params: {
    city?: string;
    cartProductIds?: string[];
  } = {}): Promise<HomeData> {
    const { city = 'All Cities', cartProductIds = [] } = params;

    // Return in-flight initial fetch promise if already running
    if (this.inFlightInitialPromise) {
      return this.inFlightInitialPromise;
    }

    const startTime = Date.now();
    console.log('[HomeData] Initial home fetch started', { city });

    this.inFlightInitialPromise = (async () => {
      try {
        const queryParams = new URLSearchParams();
        if (city && city !== 'All Cities') {
          queryParams.append('city', city);
        }
        if (cartProductIds && cartProductIds.length > 0) {
          queryParams.append('cartProductIds', cartProductIds.join(','));
        }

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

        // Try primary mobile route with fallback to general customer route
        let res;
        try {
          res = await apiFetch<any>(`/customer-mobile/home${queryString}`, {
            method: 'GET',
          });
        } catch (mobileErr) {
          res = await apiFetch<any>(`/customer/home${queryString}`, {
            method: 'GET',
          });
        }

        if (!res.ok || !res.data) {
          throw new Error('Failed to load marketplace home data from server');
        }

        const homeData = this.parseHomePayload(res.data.data || res.data);

        // Update in-memory cache and timestamp
        this.inMemoryCache = homeData;
        this.lastFetchedTimestamp = Date.now();

        // Background persist to secure storage
        secureStorage.setItem(STORAGE_HOME_CACHE_KEY, JSON.stringify(homeData)).catch(() => {});

        console.log(`[HomeData] Initial fetch success (${Date.now() - startTime}ms)`);
        return homeData;
      } catch (err: any) {
        console.warn(`[HomeData] Initial fetch error (${Date.now() - startTime}ms):`, err?.message);

        // If network request failed but we have cached data, return cached data to prevent UI blanking
        if (this.inMemoryCache) {
          return this.inMemoryCache;
        }

        const persisted = await this.getPersistedHomeData();
        if (persisted) {
          return persisted;
        }

        throw err;
      } finally {
        this.inFlightInitialPromise = null;
      }
    })();

    return this.inFlightInitialPromise;
  }

  /**
   * Dedicated Refresh feature method.
   * ONLY invoked when the customer explicitly performs the refresh action on the Home screen.
   * Updates data to the latest one directly from backend.
   */
  public async refreshHomeData(params: {
    city?: string;
    cartProductIds?: string[];
  } = {}): Promise<HomeData> {
    const { city = 'All Cities', cartProductIds = [] } = params;

    // Deduplicate against multiple simultaneous refresh gestures
    if (this.inFlightRefreshPromise) {
      return this.inFlightRefreshPromise;
    }

    const startTime = Date.now();
    console.log('[HomeRefresh] Customer action: pull-to-refresh started', { city });

    this.inFlightRefreshPromise = (async () => {
      try {
        const queryParams = new URLSearchParams();
        if (city && city !== 'All Cities') {
          queryParams.append('city', city);
        }
        if (cartProductIds && cartProductIds.length > 0) {
          queryParams.append('cartProductIds', cartProductIds.join(','));
        }
        queryParams.append('force', 'true');

        const queryString = `?${queryParams.toString()}`;

        let res;
        try {
          res = await apiFetch<any>(`/customer-mobile/home${queryString}`, {
            method: 'GET',
            skipDeduplication: true,
          });
        } catch (mobileErr) {
          res = await apiFetch<any>(`/customer/home${queryString}`, {
            method: 'GET',
            skipDeduplication: true,
          });
        }

        if (!res.ok || !res.data) {
          throw new Error('Failed to refresh marketplace home data from server');
        }

        const homeData = this.parseHomePayload(res.data.data || res.data);

        // Update in-memory cache and timestamp with latest authoritative data
        this.inMemoryCache = homeData;
        this.lastFetchedTimestamp = Date.now();

        // Background persist to secure storage
        secureStorage.setItem(STORAGE_HOME_CACHE_KEY, JSON.stringify(homeData)).catch(() => {});

        console.log(`[HomeRefresh] Pull-to-refresh completed successfully in ${Date.now() - startTime}ms`);
        return homeData;
      } catch (err: any) {
        console.warn(`[HomeRefresh] Pull-to-refresh failed in ${Date.now() - startTime}ms:`, err?.message);

        // Keep current cache intact so screen does not blank out
        if (this.inMemoryCache) {
          return this.inMemoryCache;
        }

        const persisted = await this.getPersistedHomeData();
        if (persisted) {
          return persisted;
        }

        throw new Error(
          err?.message && !err.message.includes('object')
            ? err.message
            : "Couldn't refresh. Please try again."
        );
      } finally {
        this.inFlightRefreshPromise = null;
      }
    })();

    return this.inFlightRefreshPromise;
  }

  /**
   * Backwards-compatible general fetch method.
   * Delegates to refreshHomeData if forceRefresh is true, or fetchInitialHomeData otherwise.
   */
  public async fetchHomeData(params: {
    city?: string;
    cartProductIds?: string[];
    forceRefresh?: boolean;
  } = {}): Promise<HomeData> {
    if (params.forceRefresh) {
      return this.refreshHomeData(params);
    }
    return this.fetchInitialHomeData(params);
  }
}

export const homeService = new HomeService();
