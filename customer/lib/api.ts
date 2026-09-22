import {
  CustomerProduct,
  CustomerCategory,
  OperationalCity,
  PaymentMethodItem,
  CustomerOrder,
  CustomerUser,
} from '@/types/marketplace';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class CustomerApiClient {
  private token: string | null = null;
  private inFlightRequests: Map<string, Promise<any>> = new Map();
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();

  setToken(token: string | null) {
    this.token = token;
    this.cache.clear();
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('ardab_customer_jwt', token);
      } else {
        localStorage.removeItem('ardab_customer_jwt');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ardab_customer_jwt');
    }
    return null;
  }

  clearCache() {
    this.cache.clear();
  }

  private getDeviceId(): string {
    if (typeof window === 'undefined') return 'server';
    let devId = localStorage.getItem('ardab_customer_device_id');
    if (!devId) {
      devId = 'cust_dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      localStorage.setItem('ardab_customer_device_id', devId);
    }
    return devId;
  }

  async request<T>(endpoint: string, options: RequestInit = {}, cacheTtlMs: number = 0): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const isGet = method === 'GET';

    // 1. Instant Cache Hit for safe public reference GET requests (0ms)
    if (isGet && cacheTtlMs > 0) {
      const cached = this.cache.get(endpoint);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data as T;
      }
    }

    // 2. In-Flight Request Deduplication (prevents duplicate parallel network calls)
    if (isGet && this.inFlightRequests.has(endpoint)) {
      return this.inFlightRequests.get(endpoint)! as Promise<T>;
    }

    const fetchPromise = (async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-App-Source': 'CUSTOMER_WEB',
          'X-Client-Device-Id': this.getDeviceId(),
          ...((options.headers as Record<string, string>) || {}),
        };

        const token = this.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          let errorMsg = json.error?.message || json.message;
          if (json.error?.details && Array.isArray(json.error.details) && json.error.details.length > 0) {
            errorMsg = json.error.details.map((d: any) => d.message || d.field).join('. ');
          }
          throw new Error(errorMsg || `Request failed with status ${res.status}`);
        }

        const result = json.data !== undefined ? json.data : json;

        // Store into client memory cache if cacheTtlMs configured
        if (isGet && cacheTtlMs > 0) {
          this.cache.set(endpoint, {
            data: result,
            expiresAt: Date.now() + cacheTtlMs,
          });
        }

        return result as T;
      } finally {
        if (isGet) {
          this.inFlightRequests.delete(endpoint);
        }
      }
    })();

    if (isGet) {
      this.inFlightRequests.set(endpoint, fetchPromise);
    }

    return fetchPromise;
  }

  // --- Auth Endpoints ---
  async register(data: { email?: string; phone: string; city: string; fullName?: string }) {
    return this.request<{ verificationRequired: boolean; deliveryMethod: string; message: string; verificationToken?: string }>(
      '/api/customer/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async resendVerification(email: string) {
    return this.request<{ deliveryMethod: string; message: string; verificationToken?: string }>(
      '/api/customer/auth/resend-verification',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  }

  async verifyEmail(data: string | { email?: string; token: string }) {
    const payload = typeof data === 'string' ? { token: data } : data;
    return this.request<{ verified: boolean; alreadyVerified?: boolean; customer?: CustomerUser; nextStep?: string }>(
      '/api/customer/auth/verify-email',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async setPassword(data: string | { email?: string; password: string; token?: string }, maybePassword?: string) {
    const payload = typeof data === 'string'
      ? { token: data, password: maybePassword || '' }
      : data;
    const result = await this.request<{ token: string; customer: CustomerUser }>('/api/customer/auth/set-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  async login(data: { identifier: string; password: string }) {
    const result = await this.request<{ token: string; customer: CustomerUser }>('/api/customer/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  async googleLogin(data: { email: string; name?: string; picture?: string }) {
    const result = await this.request<{ token: string; customer: CustomerUser }>('/api/customer/auth/google-login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string; resetToken?: string }>('/api/customer/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { token: string; email?: string; password?: string; newPassword?: string }) {
    return this.request<{ success: boolean; message: string }>('/api/customer/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<CustomerUser>('/api/customer/auth/me');
  }

  // --- Catalog Endpoints ---
  async getProducts(params: Record<string, string | number | boolean | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    return this.request<{ items: CustomerProduct[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>(
      `/api/customer/catalog/products?${query.toString()}`
    );
  }

  async getProduct(id: string) {
    return this.request<CustomerProduct>(`/api/customer/catalog/products/${id}`);
  }

  async getCategoryTree() {
    return this.request<CustomerCategory[]>('/api/customer/catalog/categories/tree');
  }

  async getCategory(id: string) {
    return this.request<CustomerCategory>(`/api/customer/catalog/categories/${id}`);
  }

  async getCategoryAttributes(id: string) {
    return this.request<any>(`/api/customer/catalog/categories/${id}/attributes`);
  }

  async getCities() {
    return this.request<OperationalCity[]>('/api/customer/catalog/cities');
  }

  async getPaymentMethods() {
    return this.request<PaymentMethodItem[]>('/api/customer/catalog/payment-methods', {}, 600_000);
  }

  async getSellers(params: Record<string, string | number> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val) query.append(key, String(val));
    });
    return this.request<any>(`/api/customer/catalog/sellers?${query.toString()}`);
  }

  async getSeller(id: string) {
    return this.request<any>(`/api/customer/catalog/sellers/${id}`);
  }

  // --- Checkout & Orders ---
  async checkout(payload: {
    customerId?: string;
    items: Array<{ productId: string; quantity: number }>;
    deliveryAddress: {
      recipientName: string;
      phone: string;
      city: string;
      deliveryZone?: string;
      neighborhood?: string;
      addressLine: string;
    };
    paymentMethod: string;
    customerNote?: string;
    idempotencyKey?: string;
  }) {
    return this.request<CustomerOrder>('/api/customer/orders/checkout', {
      method: 'POST',
      headers: payload.idempotencyKey ? { 'Idempotency-Key': payload.idempotencyKey } : {},
      body: JSON.stringify(payload),
    });
  }

  async getMyOrders(params: Record<string, string | number> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val) query.append(key, String(val));
    });
    return this.request<{ orders: CustomerOrder[]; pagination: any }>(`/api/customer/orders?${query.toString()}`);
  }

  async getOrder(id: string) {
    return this.request<CustomerOrder>(`/api/customer/orders/${id}`);
  }

  async cancelOrder(id: string, reason: string) {
    return this.request<CustomerOrder>(`/api/customer/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- Wishlist ---
  async getWishlist() {
    return this.request<{ items: any[]; total: number }>('/api/customer/wishlist');
  }

  async toggleWishlist(productId: string) {
    return this.request<{ action: 'added' | 'removed'; productId?: string; item?: any }>(
      '/api/customer/wishlist/toggle',
      {
        method: 'POST',
        body: JSON.stringify({ productId }),
      }
    );
  }

  async removeFromWishlist(productId: string) {
    return this.request<{ removed: boolean; productId: string }>(
      `/api/customer/wishlist/${productId}`,
      { method: 'DELETE' }
    );
  }

  async clearWishlist() {
    return this.request<{ removed: number }>('/api/customer/wishlist', { method: 'DELETE' });
  }

  async syncWishlist(productIds: string[]) {
    return this.request<{ synced: number; total: number; items: any[] }>(
      '/api/customer/wishlist/sync',
      {
        method: 'POST',
        body: JSON.stringify({ productIds }),
      }
    );
  }

  async checkWishlistItem(productId: string) {
    return this.request<{ inWishlist: boolean; productId: string }>(
      `/api/customer/wishlist/check/${productId}`
    );
  }

  // --- Reviews ---
  async getReviews(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params);
    return this.request<any>(`/api/customer/catalog/reviews?${query.toString()}`);
  }

  async submitReview(data: {
    productId?: string;
    sellerId?: string;
    orderId?: string;
    rating: number;
    title?: string;
    comment: string;
    authorName?: string;
    isAnonymous?: boolean;
  }) {
    if (data.productId) {
      return this.submitProductReview(data.productId, data);
    }
    return this.request<any>('/api/customer/catalog/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProductReviews(productId: string, params: Record<string, any> = {}) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
    });
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return this.request<{
      summary: {
        averageRating: number;
        totalReviews: number;
        ratingDistribution: Record<number, number>;
        ratingPercentages: Record<number, number>;
      };
      items: any[];
      customerReview?: any;
      eligibility?: {
        canReview: boolean;
        reason: string | null;
        message: string | null;
        orderId: string | null;
        existingReview: any;
      };
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>(`/api/customer/products/${productId}/reviews${query}`);
  }

  async checkReviewEligibility(productId: string) {
    return this.request<{
      canReview: boolean;
      reason: string | null;
      message: string | null;
      orderId: string | null;
      existingReview: any;
    }>(`/api/customer/products/${productId}/review-eligibility`);
  }

  async submitProductReview(productId: string, data: { rating: number; comment: string; title?: string; isAnonymous?: boolean }) {
    return this.request<any>(`/api/customer/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyReviews(params: Record<string, any> = {}) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
    });
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return this.request<{
      items: any[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>(`/api/customer/reviews${query}`);
  }

  async getMyReviewById(reviewId: string) {
    return this.request<any>(`/api/customer/reviews/${reviewId}`);
  }

  async updateMyReview(reviewId: string, data: { rating?: number; comment?: string; title?: string; isAnonymous?: boolean }) {
    return this.request<any>(`/api/customer/reviews/${reviewId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMyReview(reviewId: string) {
    return this.request<{ success: boolean; message: string }>(`/api/customer/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  }

  async getCategories() {
    return this.request<CustomerCategory[]>('/api/customer/catalog/categories/tree', {}, 300_000);
  }

  async getOperationalCities() {
    return this.request<OperationalCity[]>('/api/customer/catalog/cities', {}, 600_000);
  }

  // --- Customer Support ---
  async getSupportCategories() {
    return this.request<any[]>('/api/customer/support/categories', {}, 300_000);
  }

  async getSupportOrders() {
    return this.request<any[]>('/api/customer/support/orders');
  }

  async getMySupportRequests(params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, String(val));
    });
    const qs = query.toString();
    const endpoint = qs ? `/api/customer/support/requests?${qs}` : '/api/customer/support/requests';
    return this.request<{ items: any[]; pagination: any }>(endpoint);
  }

  async getSupportRequest(id: string) {
    return this.request<any>(`/api/customer/support/requests/${id}`);
  }

  async createSupportRequest(data: any) {
    return this.request<any>('/api/customer/support/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async replySupportRequest(id: string, data: { message: string; idempotencyKey?: string }) {
    return this.request<any>(`/api/customer/support/requests/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markSupportRequestRead(id: string) {
    return this.request<any>(`/api/customer/support/requests/${id}/read`, {
      method: 'PATCH',
    });
  }
}

export const customerApi = new CustomerApiClient();

export const catalogApi = {
  getCategories: async (params?: any) => {
    const res: any = await customerApi.getCategories();
    const list = Array.isArray(res) ? res : res?.items || [];
    return { data: list };
  },
  getProducts: async (params?: any) => {
    const res: any = await customerApi.getProducts(params);
    const items = res?.items || (Array.isArray(res) ? res : []);
    const pagination = res?.pagination || { total: items.length, page: 1, pageSize: 12, totalPages: 1 };
    return { data: items, pagination };
  },
  getProductById: async (id: string) => {
    const res: any = await customerApi.getProduct(id);
    return { data: res?.data || res };
  },
  getProduct: async (id: string) => {
    const res: any = await customerApi.getProduct(id);
    return { data: res?.data || res };
  },
  getOperationalCities: async () => {
    const res: any = await customerApi.getOperationalCities();
    return { data: Array.isArray(res) ? res : res?.items || [] };
  },
  getPaymentMethods: async () => {
    const res: any = await customerApi.getPaymentMethods();
    return { data: Array.isArray(res) ? res : res?.items || [] };
  },
  getProductReviews: async (productId: string, params?: any) => {
    const res: any = await customerApi.getProductReviews(productId, params);
    return {
      data: res?.items || (Array.isArray(res) ? res : []),
      summary: res?.summary,
      customerReview: res?.customerReview,
      eligibility: res?.eligibility,
      pagination: res?.pagination,
    };
  },
  createReview: async (data: any) => {
    const res: any = await customerApi.submitProductReview(data.productId, data);
    return { data: res?.data || res };
  },
};

export const ordersApi = {
  checkout: async (payload: any) => {
    const res: any = await customerApi.checkout(payload);
    return { data: res?.data || res };
  },
  getMyOrders: async (params?: any) => {
    const res: any = await customerApi.getMyOrders(params);
    // Backend now returns { orders: [...], pagination: {...} }
    const items = res?.orders || res?.items || (Array.isArray(res) ? res : []);
    return { data: items, pagination: res?.pagination };
  },
  getOrderById: async (id: string) => {
    const res: any = await customerApi.getOrder(id);
    return { data: res?.data || res };
  },
  getOrder: async (id: string) => {
    const res: any = await customerApi.getOrder(id);
    return { data: res?.data || res };
  },
  cancelOrder: async (id: string, reason: string) => {
    const res: any = await customerApi.cancelOrder(id, reason);
    return { data: res?.data || res };
  },
};

export const wishlistApi = {
  getWishlist: async () => {
    const res: any = await customerApi.getWishlist();
    return { data: res?.items || [], total: res?.total || 0 };
  },
  toggle: async (productId: string) => {
    return customerApi.toggleWishlist(productId);
  },
  remove: async (productId: string) => {
    return customerApi.removeFromWishlist(productId);
  },
  clear: async () => {
    return customerApi.clearWishlist();
  },
  sync: async (productIds: string[]) => {
    return customerApi.syncWishlist(productIds);
  },
  check: async (productId: string) => {
    return customerApi.checkWishlistItem(productId);
  },
};

export const supportApi = {
  getCategories: async () => {
    return customerApi.getSupportCategories();
  },
  getRecentOrders: async () => {
    return customerApi.getSupportOrders();
  },
  getMyRequests: async (params?: { page?: number; pageSize?: number; status?: string; search?: string }) => {
    return customerApi.getMySupportRequests(params);
  },
  getRequestById: async (id: string) => {
    return customerApi.getSupportRequest(id);
  },
  createRequest: async (payload: any) => {
    return customerApi.createSupportRequest(payload);
  },
  replyRequest: async (id: string, payload: { message: string; idempotencyKey?: string }) => {
    return customerApi.replySupportRequest(id, payload);
  },
  markAsRead: async (id: string) => {
    return customerApi.markSupportRequestRead(id);
  },
};

export const reviewsApi = {
  getProductReviews: async (productId: string, params?: any) => {
    return customerApi.getProductReviews(productId, params);
  },
  checkEligibility: async (productId: string) => {
    return customerApi.checkReviewEligibility(productId);
  },
  submitReview: async (productId: string, data: { rating: number; comment: string; title?: string; isAnonymous?: boolean }) => {
    return customerApi.submitProductReview(productId, data);
  },
  getMyReviews: async (params?: any) => {
    return customerApi.getMyReviews(params);
  },
  getReviewById: async (reviewId: string) => {
    return customerApi.getMyReviewById(reviewId);
  },
  updateReview: async (reviewId: string, data: any) => {
    return customerApi.updateMyReview(reviewId, data);
  },
  deleteReview: async (reviewId: string) => {
    return customerApi.deleteMyReview(reviewId);
  },
};

export type Product = CustomerProduct;
export type Category = CustomerCategory;
export type Order = CustomerOrder;
export type PaymentMethod = PaymentMethodItem;
export type Review = any;

