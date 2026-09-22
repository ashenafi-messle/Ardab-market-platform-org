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

  setToken(token: string | null) {
    this.token = token;
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

  private getDeviceId(): string {
    if (typeof window === 'undefined') return 'server';
    let devId = localStorage.getItem('ardab_customer_device_id');
    if (!devId) {
      devId = 'cust_dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      localStorage.setItem('ardab_customer_device_id', devId);
    }
    return devId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

    return json.data !== undefined ? json.data : json;
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
    return this.request<PaymentMethodItem[]>('/api/customer/catalog/payment-methods');
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
    title: string;
    comment: string;
    authorName?: string;
  }) {
    return this.request<any>('/api/customer/catalog/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCategories() {
    return this.request<CustomerCategory[]>('/api/customer/catalog/categories/tree');
  }

  async getOperationalCities() {
    return this.request<OperationalCity[]>('/api/customer/catalog/cities');
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
  getProductReviews: async (productId: string) => {
    const res: any = await customerApi.getReviews({ productId });
    return { data: Array.isArray(res) ? res : res?.items || [] };
  },
  createReview: async (data: any) => {
    const res: any = await customerApi.submitReview(data);
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

export type Product = CustomerProduct;
export type Category = CustomerCategory;
export type Order = CustomerOrder;
export type PaymentMethod = PaymentMethodItem;
export type Review = any;
