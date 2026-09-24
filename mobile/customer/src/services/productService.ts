// ==============================================================================
// Ardab Market - Mobile Customer Product Service
// ==============================================================================
// Communicates directly with deployed Render backend (/customer/catalog/products)
// Provides resilient caching and smooth fallback for offline/development use.

import { apiFetch } from '@/constants/api';
import { Product } from '@/types';
import { MOCK_PRODUCTS } from '@/constants/mockData';

export function mapBackendProductToMobile(item: any): Product {
  const images = (item.images && item.images.length > 0)
    ? item.images.map((img: any) => img.url).filter(Boolean)
    : (item.primaryImage?.url ? [item.primaryImage.url] : ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80']);

  const price = Number(item.sellingPrice) || 0;
  const oldPrice = item.comparePrice ? Number(item.comparePrice) : undefined;
  const discountPercentage = oldPrice && oldPrice > price
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : undefined;

  return {
    id: item.id,
    name: item.name || 'Ardab Product',
    nameAmharic: item.nameAmharic || item.name || 'የአርዳብ ምርት',
    description: item.description || '',
    price,
    oldPrice,
    discountPercentage,
    rating: Number(item.averageRating || item.rating?.average || 4.5),
    reviewCount: Number(item.reviewCount || 0),
    soldCount: Number(item.soldCount || 10),
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'],
    categoryId: item.category?.id || item.categoryId || 'cat-general',
    categoryName: item.category?.name || 'General',
    subcategoryId: item.subcategoryId,
    subcategoryName: item.subcategory?.name,
    seller: {
      id: item.seller?.id || 'seller-1',
      name: item.seller?.companyName || item.seller?.name || 'Ardab Market Seller',
      verified: true,
      rating: 4.8,
      salesCount: 120,
      city: item.seller?.city || 'Gondar',
      responseRate: '98%',
    },
    stock: item.stock !== undefined ? Number(item.stock) : 50,
    unit: item.unit || 'pc',
    isFlashDeal: Boolean(item.isFlashDeal),
    isPopular: true,
    isRecommended: true,
    origin: item.seller?.city || 'Ethiopia',
  };
}

let cachedProducts: Product[] | null = null;

export const productService = {
  /**
   * Fetches products from the deployed Render backend catalog
   */
  async fetchProducts(params?: {
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Product[]> {
    try {
      const queryParts: string[] = [];
      if (params?.categoryId) queryParts.push(`categoryId=${encodeURIComponent(params.categoryId)}`);
      if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.page) queryParts.push(`page=${params.page}`);
      queryParts.push(`limit=${params?.limit || 20}`);

      const endpoint = `/customer/catalog/products?${queryParts.join('&')}`;
      const res = await apiFetch(endpoint);

      if (res.ok && res.data) {
        const rawItems = res.data.data?.items || res.data.data?.products || (Array.isArray(res.data.data) ? res.data.data : null);
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const mapped = rawItems.map(mapBackendProductToMobile);
          if (!params?.categoryId && !params?.search) {
            cachedProducts = mapped;
          }
          return mapped;
        }
      }
    } catch {
      // Backend unreachable or waking up; fall back gracefully
    }

    if (cachedProducts && (!params?.categoryId && !params?.search)) {
      return cachedProducts;
    }

    // Resilient fallback to curated Ethiopian catalog
    let list = [...MOCK_PRODUCTS];
    if (params?.categoryId) {
      list = list.filter((p) => p.categoryId === params.categoryId || p.subcategoryId === params.categoryId);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return list;
  },

  /**
   * Fetches single product details by ID
   */
  async fetchProductById(id: string): Promise<Product | null> {
    try {
      const res = await apiFetch(`/customer/catalog/products/${id}`);
      if (res.ok && res.data?.data) {
        return mapBackendProductToMobile(res.data.data);
      }
    } catch {
      // Fallback
    }

    // Fallback to cache or mock
    const fromCache = cachedProducts?.find((p) => p.id === id);
    if (fromCache) return fromCache;

    const fromMock = MOCK_PRODUCTS.find((p) => p.id === id);
    return fromMock || null;
  },
};
