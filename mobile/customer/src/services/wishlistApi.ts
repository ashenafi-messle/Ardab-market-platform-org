// ==============================================================================
// Ardab Market - Mobile Customer Wishlist API Service
// ==============================================================================

import { apiFetch } from '@/constants/api';
import { Product } from '@/types';

export interface WishlistResponse {
  items: Array<{
    id: string;
    customerId: string;
    productId: string;
    addedAt: string;
    product: any;
  }>;
  total: number;
}

export const wishlistApi = {
  /**
   * Fetches the authenticated customer's wishlist from the server
   */
  async getWishlist(): Promise<Product[]> {
    try {
      let res = await apiFetch<any>('/customer/wishlist');
      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/wishlist');
      }

      if (res.ok && res.data) {
        const rawItems = res.data.data?.items || res.data.items || [];
        return rawItems
          .map((item: any) => {
            const p = item.product;
            if (!p) return null;
            const price = p.priceEtb || Number(p.sellingPrice) || 0;
            const originalPrice = p.originalPrice ? Number(p.originalPrice) : price;
            const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
            const imgUrl = p.primaryImage?.url || p.images?.[0]?.url || p.thumbnail || '';

            return {
              id: p.id,
              itemCode: p.itemCode || '',
              name: p.name,
              description: p.description || '',
              price: price,
              oldPrice: discount > 0 ? originalPrice : undefined,
              discountPercentage: discount > 0 ? discount : undefined,
              rating: p.averageRating || p.rating?.average || 4.5,
              reviewCount: p.reviewCount || p.rating?.count || 0,
              soldCount: p.soldCount || 10,
              images: imgUrl ? [imgUrl] : [],
              primaryImage: imgUrl ? { url: imgUrl } : undefined,
              categoryId: p.category?.id || '',
              categoryName: p.category?.name || 'General',
              seller: {
                id: p.seller?.id || 'direct-hub',
                name: p.seller?.companyName || p.seller?.name || 'Ardab Direct Hub',
                verified: true,
                rating: 4.8,
                salesCount: 120,
                city: 'Gondar',
              },
              stock: p.status === 'OUT_OF_STOCK' ? 0 : 50,
              unit: p.unit || 'pc',
            } as Product;
          })
          .filter(Boolean);
      }
      return [];
    } catch (err) {
      console.warn('[wishlistApi] Error fetching wishlist:', err);
      return [];
    }
  },

  /**
   * Adds a product to the authenticated customer's wishlist
   */
  async addToWishlist(productId: string): Promise<boolean> {
    try {
      let res = await apiFetch<any>('/customer/wishlist', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/wishlist', {
          method: 'POST',
          body: JSON.stringify({ productId }),
        });
      }
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Removes a product from the customer's wishlist
   */
  async removeFromWishlist(productId: string): Promise<boolean> {
    try {
      let res = await apiFetch<any>(`/customer/wishlist/${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        res = await apiFetch<any>(`/customer-mobile/wishlist/${productId}`, {
          method: 'DELETE',
        });
      }
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Toggles product in customer's wishlist
   */
  async toggleWishlist(productId: string): Promise<{ inWishlist: boolean }> {
    try {
      let res = await apiFetch<any>('/customer/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/wishlist/toggle', {
          method: 'POST',
          body: JSON.stringify({ productId }),
        });
      }

      if (res.ok && res.data) {
        const action = res.data.data?.action || res.data.action;
        return { inWishlist: action === 'added' };
      }
      return { inWishlist: false };
    } catch {
      return { inWishlist: false };
    }
  },

  /**
   * Checks if product is in authenticated customer's wishlist
   */
  async checkWishlist(productId: string): Promise<boolean> {
    try {
      let res = await apiFetch<any>(`/customer/wishlist/check/${productId}`);
      if (!res.ok) {
        res = await apiFetch<any>(`/customer-mobile/wishlist/check/${productId}`);
      }

      if (res.ok && res.data) {
        return Boolean(res.data.data?.inWishlist ?? res.data.inWishlist);
      }
      return false;
    } catch {
      return false;
    }
  },
};
