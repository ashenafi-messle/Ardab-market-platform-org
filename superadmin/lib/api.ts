/**
 * Ardab Market - API Service Abstraction Layer
 * 
 * FUTURE PRODUCTION ARCHITECTURE:
 * Super Admin UI -> lib/api.ts -> Node.js + Express.js REST API -> Prisma ORM -> PostgreSQL + PostGIS
 * (NO NestJS, NO direct DB connections from frontend)
 * 
 * This file provides a clean contract matching future Express REST endpoints.
 */

import {
  mockVehicles,
  mockDrivers,
  mockTrips,
  mockRevenueMetrics,
  mockTransactions,
  mockSalesByCity,
  mockSalesByCategory,
  mockOperationalPerformance,
  mockAdminUsers,
  mockAuditLogs,
  mockCitiesConfig,
  mockPlatformSettings,
  mockSystemServices,
  mockMaintenanceWindows,
  mockMaintenanceTasks,
  mockEquipmentLogs,
  mockFeedbackItems,
  mockFeedbackMetrics,
  mockActiveSessions,
  mockSecurityAlerts,
  mockIpBlockRules,
  mockFailedLogins,
} from './mock-data';

import { LoginCredentials, AuthResponse, ForgotPasswordRequest, ResetPasswordRequest, SuperAdminUser } from '@/types/auth';
import {
  Product,
  Category,
  CreateProductInput,
  UpdateProductInput,
  ProductListParams,
  ProductListResult,
  ProductStatus,
  ProductImageItem,
  AttributeDefinition,
  EffectiveCategoryAttributes,
  CategoryLocalAttributesResponse,
} from '@/types/product';
import {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierListParams,
  SupplierListResult,
} from '@/types/supplier';
import { PaymentMethod } from '@/types/paymentMethod';
import {
  Customer,
  CustomerAccountStatus,
  CustomerVerificationStatus,
  CustomerSummaryMetrics,
  CustomerListParams,
  CustomerListResult,
  CustomerActivityItem,
} from '@/types/customer';
import { Order, OrderStatus, OrderSummaryMetrics, OrderTimelineEvent } from '@/types/order';
import { Vehicle } from '@/types/vehicle';
import { Driver } from '@/types/driver';
import { Trip, TripStatus } from '@/types/trip';
import {
  Delivery,
  DeliverySummaryMetrics,
  DeliveryTimelineEvent,
  AvailableTrip,
} from '@/types/delivery';
import { RevenueMetrics, Transaction } from '@/types/finance';
import { SalesByCity, SalesByCategory, OperationalPerformance } from '@/types/report';
import { Notification, NotificationSummary } from '@/types/notification';
import { AdminUser, AuditLog, ActiveSession, SecurityAlert, IpBlockRule, FailedLoginLog, SecurityStatistics, SecurityEventItem } from '@/types/security';
import { CityConfig, PlatformSettings } from '@/types/settings';
import { SupportTicket, TicketStatus, SupportCategory, SupportStatistics } from '@/types/support';
import { SystemService, MaintenanceWindow, MaintenanceTask, EquipmentServiceLog } from '@/types/maintenance';
import {
  FeedbackItem,
  FeedbackMetrics,
  FeedbackStatus,
  FeedbackCategory,
  FeedbackModerationAction,
  FeedbackReportItem,
} from '@/types/feedback';

import { PaginatedResponse, QueryOptions } from '@/types/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

// Helper to simulate network latency for realistic async behavior
const delay = (ms: number = 100) => new Promise((resolve) => setTimeout(resolve, ms));

export class ApiResponseError extends Error {
  statusCode: number;
  code?: string;
  retryAfterSeconds?: number;

  constructor(message: string, statusCode: number = 500, code?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiResponseError';
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function paginateItems<T>(items: T[], page: number = 1, pageSize: number = DEFAULT_PAGE_SIZE): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const validPage = Math.max(1, Math.min(page, totalPages));
  const start = (validPage - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  return {
    data,
    pagination: {
      page: validPage,
      pageSize,
      total,
      totalPages,
    },
  };
}


// ==========================================
// 1. Authentication Services (POST /api/auth/*)
// ==========================================
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let inMemoryToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem('ardab_admin_token', token);
      } else {
        localStorage.removeItem('ardab_admin_token');
      }
    } catch {
      // Ignore localStorage errors
    }
  }
};

export const getAuthToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('ardab_admin_token');
      if (stored) {
        inMemoryToken = stored;
        return stored;
      }
    } catch {
      // Ignore localStorage errors
    }
  }
  return null;
};

interface BackendAuthPayload {
  success?: boolean;
  message?: string;
  token?: string;
  user?: SuperAdminUser;
  data?: {
    token?: string;
    user?: SuperAdminUser;
    message?: string;
  };
  error?: {
    code?: string;
    message?: string;
    details?: any[];
  };
}

async function fetchAuthApi<T = BackendAuthPayload>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }


  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiResponseError('Unable to connect to Ardab Market server. Please check your connection.', 503, 'NETWORK_ERROR');
  }

  let data: BackendAuthPayload;
  try {
    data = (await response.json()) as BackendAuthPayload;
  } catch {
    if (response.status === 401) {
      setAuthToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:session_expired', {
            detail: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Please sign in again.', status: 401 },
          })
        );
      }
      throw new ApiResponseError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
    }
    throw new ApiResponseError('Server returned an invalid response format.', response.status, 'INVALID_RESPONSE');
  }

  if (!response.ok || data.success === false) {
    const errorObj = data?.error || {};
    const code = errorObj.code || 'AUTH_ERROR';
    let message = errorObj.message || data?.message || 'Authentication operation failed.';

    if (code === 'INVALID_CREDENTIALS') {
      message = 'Invalid email or password.';
    } else if (code === 'SESSION_EXPIRED' || code === 'SESSION_REVOKED') {
      message = 'Your session has expired. Please sign in again.';
    } else if (code === 'RATE_LIMITED') {
      message = 'Too many attempts. Please wait and try again.';
    } else if (code === 'INVALID_RESET_TOKEN') {
      message = 'This password reset link is invalid or has expired.';
    }

    if (
      response.status === 401 ||
      code === 'SESSION_EXPIRED' ||
      code === 'SESSION_REVOKED' ||
      code === 'TOKEN_EXPIRED' ||
      code === 'INVALID_TOKEN'
    ) {
      setAuthToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:session_expired', {
            detail: { code, message, status: response.status },
          })
        );
      }
    }

    const details = errorObj.details;
    if (code === 'VALIDATION_ERROR' && Array.isArray(details) && details.length > 0) {
      const fieldErrors = details.map((d: any) => `${d.field ? `${d.field}: ` : ''}${d.message}`).join(', ');
      message = `${message} (${fieldErrors})`;
    }

    throw new ApiResponseError(message, response.status, code);
  }

  return data as T;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const res = await fetchAuthApi<BackendAuthPayload>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        }),
      });

      const token = res.data?.token || res.token;
      const user = res.data?.user || res.user;

      if (token) {
        setAuthToken(token);
      }

      return {
        success: true,
        message: res.message || 'Authenticated successfully',
        token,
        user,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password.';
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  getMe: async (): Promise<SuperAdminUser | null> => {
    try {
      const res = await fetchAuthApi<BackendAuthPayload>('/api/auth/me', {
        method: 'GET',
      });
      const user = res.data?.user || res.user;
      return user || null;
    } catch {
      return null;
    }
  },

  forgotPassword: async (request: ForgotPasswordRequest): Promise<{ success: boolean; message: string }> => {
    try {
      await fetchAuthApi<BackendAuthPayload>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: request.email.trim().toLowerCase() }),
      });
    } catch {
      // Security: Never reveal enumeration errors
    }
    return {
      success: true,
      message: 'If an account exists for this email, password reset instructions have been sent.',
    };
  },

  resetPassword: async (request: ResetPasswordRequest): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchAuthApi<BackendAuthPayload>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: request.token,
          newPassword: request.newPassword,
          confirmPassword: request.confirmPassword,
        }),
      });
      return {
        success: true,
        message: res.message || 'Your password has been successfully reset. Please log in with your new credentials.',
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'This password reset link is invalid or has expired.';
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  logout: async (): Promise<{ success: boolean }> => {
    try {
      await fetchAuthApi<BackendAuthPayload>('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setAuthToken(null);
    }
    return { success: true };
  },
};

// ==========================================
// 2. Marketplace: Products & Categories (GET/POST /api/products, /api/categories)
// ==========================================
function normalizeProduct(raw: unknown): Product {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const categoryObj = typeof r.category === 'object' && r.category ? (r.category as { id?: string; name?: string; slug?: string; icon?: string | null }) : null;
  const sellerObj = typeof r.seller === 'object' && r.seller ? (r.seller as { id: string; companyName: string; name: string; phone?: string; city?: string; status?: string }) : null;

  const rawImages = Array.isArray(r.images) ? r.images : [];
  const normalizedImages: (string | ProductImageItem)[] = rawImages.map((img) => {
    if (img && typeof img === 'object') {
      const item = img as Record<string, unknown>;
      return {
        id: String(item.id || ''),
        productId: item.productId ? String(item.productId) : undefined,
        url: String(item.url || ''),
        publicId: item.publicId ? String(item.publicId) : undefined,
        width: typeof item.width === 'number' ? item.width : null,
        height: typeof item.height === 'number' ? item.height : null,
        format: item.format ? String(item.format) : null,
        bytes: typeof item.bytes === 'number' ? item.bytes : null,
        sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
        isPrimary: Boolean(item.isPrimary),
        thumbnailUrl: item.thumbnailUrl ? String(item.thumbnailUrl) : String(item.url || ''),
        createdAt: item.createdAt ? String(item.createdAt) : undefined,
        updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
      } as ProductImageItem;
    }
    return String(img);
  });

  const primaryObj = normalizedImages.find(
    (img): img is ProductImageItem => typeof img === 'object' && img !== null && img.isPrimary
  ) || (typeof normalizedImages[0] === 'object' ? (normalizedImages[0] as ProductImageItem) : null);

  const primaryUrl = primaryObj?.url || (typeof normalizedImages[0] === 'string' ? normalizedImages[0] : (typeof r.imageUrl === 'string' ? r.imageUrl : ''));

  const rawItemCode = String(r.itemCode || r.sku || '');
  const rawSellerId = String(r.sellerId || (sellerObj ? sellerObj.id : ''));
  const rawCategoryId = String(r.marketplaceCategoryId || categoryObj?.id || r.categoryId || '');
  const rawCategoryName = categoryObj ? String(categoryObj.name) : (typeof r.category === 'string' ? r.category : 'General');
  const rawWeight = typeof r.weight === 'number' ? r.weight : Number(r.weight || r.weightKg || 1);
  const rawCostPrice = r.costPrice !== null && r.costPrice !== undefined ? Number(r.costPrice) : null;
  const rawSellingPrice = Number(r.sellingPrice || 0);

  return {
    id: String(r.id || ''),
    name: String(r.name || ''),
    itemCode: rawItemCode,
    sku: rawItemCode,
    sellerId: rawSellerId,
    sellerName: sellerObj?.companyName || sellerObj?.name || (typeof r.sellerName === 'string' ? r.sellerName : 'Direct Platform'),
    seller: sellerObj || undefined,
    marketplaceCategoryId: rawCategoryId,
    categoryId: rawCategoryId,
    category: rawCategoryName,
    unit: String(r.unit || 'kg'),
    weight: rawWeight,
    weightKg: rawWeight,
    costPrice: rawCostPrice,
    sellingPrice: rawSellingPrice,
    originalPrice: r.originalPrice ? Number(r.originalPrice) : rawSellingPrice,
    discountPercent: typeof r.discountPercent === 'number' ? r.discountPercent : 0,
    discountPrice: r.discountPrice ? Number(r.discountPrice) : rawSellingPrice,
    images: normalizedImages,
    primaryImage: primaryObj,
    imageUrl: primaryUrl,
    cityAvailability: Array.isArray(r.cityAvailability) && r.cityAvailability.length > 0 ? (r.cityAvailability as string[]) : ['All Cities'],
    status: (r.status as ProductStatus) || 'ACTIVE',
    createdAt: String(r.createdAt || new Date().toISOString()),
    updatedAt: String(r.updatedAt || new Date().toISOString()),
  };
}

export const productsApi = {
  list: async (params: ProductListParams = {}): Promise<ProductListResult> => {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.pageSize) queryParts.push(`pageSize=${params.pageSize}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.city && params.city !== 'All Cities') queryParts.push(`city=${encodeURIComponent(params.city)}`);
    if (params.sellerId && params.sellerId !== 'all') queryParts.push(`sellerId=${encodeURIComponent(params.sellerId)}`);
    if (params.categoryId && params.categoryId !== 'all') queryParts.push(`categoryId=${encodeURIComponent(params.categoryId)}`);
    if (params.status && params.status !== 'ALL') queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.search && params.search.trim()) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await fetchAuthApi<{
      success: boolean;
      data: { items: Product[]; pagination: ProductListResult['pagination'] };
    }>(`/api/products${qs}`, {
      method: 'GET',
    });

    const items = (res.data?.items || []).map((p) => normalizeProduct(p));
    return {
      items,
      products: items,
      pagination: res.data?.pagination || {
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  getAll: async (filterCity?: string, categoryId?: string, sellerId?: string): Promise<Product[]> => {
    const queryParts: string[] = ['pageSize=100'];
    if (filterCity && filterCity !== 'All Cities') queryParts.push(`city=${encodeURIComponent(filterCity)}`);
    if (categoryId && categoryId !== 'all') queryParts.push(`categoryId=${encodeURIComponent(categoryId)}`);
    if (sellerId && sellerId !== 'all') queryParts.push(`sellerId=${encodeURIComponent(sellerId)}`);

    const res = await fetchAuthApi<{
      success: boolean;
      data: { items?: Product[] } | Product[];
    }>(`/api/products?${queryParts.join('&')}`, {
      method: 'GET',
    });

    const rawList = Array.isArray(res.data) ? res.data : (res.data?.items || []);
    return rawList.map((p) => normalizeProduct(p));
  },

  getById: async (id: string): Promise<Product> => {
    const res = await fetchAuthApi<{ success: boolean; data: Product }>(`/api/products/${id}`, {
      method: 'GET',
    });
    if (!res.data) throw new Error('Product not found');
    return normalizeProduct(res.data);
  },

  create: async (input: CreateProductInput | FormData): Promise<Product> => {
    let body: BodyInit;
    if (typeof FormData !== 'undefined' && input instanceof FormData) {
      body = input;
    } else {
      const p = input as CreateProductInput;
      body = JSON.stringify({
        name: p.name.trim(),
        description: p.description?.trim() || null,
        sellerId: p.sellerId,
        marketplaceCategoryId: p.marketplaceCategoryId,
        unit: p.unit !== undefined && p.unit !== null ? p.unit.trim() : null,
        weight: p.weight !== undefined && p.weight !== null ? Number(p.weight) : null,
        costPrice: p.costPrice !== undefined && p.costPrice !== null ? Number(p.costPrice) : null,
        sellingPrice: Number(p.sellingPrice),
        attributeValues: p.attributeValues || [],
        images: p.images || [],
        cityAvailability: p.cityAvailability && p.cityAvailability.length > 0 ? p.cityAvailability : ['All Cities'],
        status: p.status || 'ACTIVE',
      });
    }

    const res = await fetchAuthApi<{ success: boolean; data: Product }>('/api/products', {
      method: 'POST',
      body,
    });
    if (!res.data) throw new Error('Failed to create product');
    return normalizeProduct(res.data);
  },

  uploadImage: async (productId: string, file: File, isPrimary?: boolean): Promise<ProductImageItem> => {
    const formData = new FormData();
    formData.append('image', file);
    if (isPrimary !== undefined) {
      formData.append('isPrimary', String(isPrimary));
    }
    const res = await fetchAuthApi<{ success: boolean; data: ProductImageItem }>(`/api/products/${productId}/images`, {
      method: 'POST',
      body: formData,
    });
    if (!res.data) throw new Error('Failed to upload image');
    return res.data;
  },

  deleteImage: async (productId: string, imageId: string): Promise<void> => {
    await fetchAuthApi<{ success: boolean }>(`/api/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
    });
  },

  setPrimaryImage: async (productId: string, imageId: string): Promise<ProductImageItem> => {
    const res = await fetchAuthApi<{ success: boolean; data: ProductImageItem }>(`/api/products/${productId}/images/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPrimary: true }),
    });
    if (!res.data) throw new Error('Failed to set primary image');
    return res.data;
  },

  reorderImages: async (productId: string, imageIds: string[]): Promise<ProductImageItem[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: ProductImageItem[] }>(`/api/products/${productId}/images/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ imageIds }),
    });
    return res.data || [];
  },

  update: async (id: string, input: UpdateProductInput): Promise<Product> => {
    // Strictly omit itemCode (immutable) and packagingUnit (removed)
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.description !== undefined) payload.description = input.description ? input.description.trim() : null;
    if (input.sellerId !== undefined) payload.sellerId = input.sellerId;
    if (input.marketplaceCategoryId !== undefined) payload.marketplaceCategoryId = input.marketplaceCategoryId;
    if (input.unit !== undefined) payload.unit = input.unit !== null ? input.unit.trim() : null;
    if (input.weight !== undefined) payload.weight = input.weight !== null ? Number(input.weight) : null;
    if (input.costPrice !== undefined) payload.costPrice = input.costPrice !== null ? Number(input.costPrice) : null;
    if (input.sellingPrice !== undefined) payload.sellingPrice = Number(input.sellingPrice);
    if (input.attributeValues !== undefined) payload.attributeValues = input.attributeValues;
    if (input.images !== undefined) payload.images = input.images;
    if (input.cityAvailability !== undefined) payload.cityAvailability = input.cityAvailability;
    if (input.status !== undefined) payload.status = input.status;

    const res = await fetchAuthApi<{ success: boolean; data: Product }>(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (!res.data) throw new Error('Failed to update product');
    return normalizeProduct(res.data);
  },


  toggleStatus: async (id: string, status?: ProductStatus): Promise<Product> => {
    const res = await fetchAuthApi<{ success: boolean; data: Product }>(`/api/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(status ? { status } : {}),
    });
    if (!res.data) throw new Error('Failed to toggle product status');
    return normalizeProduct(res.data);
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetchAuthApi<{ success: boolean; message?: string }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
    return { success: res.success ?? true, message: res.message || 'Product archived successfully' };
  },

  getPaginated: async (options: QueryOptions = {}): Promise<PaginatedResponse<Product>> => {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, search, city, category, status } = options;
    const result = await productsApi.list({
      page,
      pageSize,
      search,
      city,
      categoryId: category,
      status,
    });
    return {
      data: result.items,
      pagination: result.pagination,
    };
  },

  bulkUpdateStatus: async (ids: string[], status: 'ACTIVE' | 'INACTIVE'): Promise<number> => {
    let count = 0;
    for (const id of ids) {
      try {
        await productsApi.toggleStatus(id, status as ProductStatus);
        count++;
      } catch {
        // Continue on error
      }
    }
    return count;
  },
};

export const categoriesApi = {
  getAll: async (params?: { parentId?: string | null; activeOnly?: boolean; search?: string }): Promise<Category[]> => {
    const query = new URLSearchParams();
    if (params?.parentId !== undefined) {
      query.append('parentId', params.parentId === null ? 'null' : params.parentId);
    }
    if (params?.activeOnly !== undefined) {
      query.append('activeOnly', String(params.activeOnly));
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    const url = `/api/categories${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetchAuthApi<{ success: boolean; data: Category[] }>(url, {
      method: 'GET',
    });
    return (res.data || []).map((c) => ({
      ...c,
      icon: c.icon || 'bi-box-seam',
      status: c.isActive !== false ? 'ACTIVE' : 'INACTIVE',
      productCount: c.productCount || 0,
      sellerCount: c.sellerCount || 0,
      childrenCount: c.childrenCount || 0,
      createdAt: c.createdAt || new Date().toISOString().split('T')[0],
    }));
  },

  getTree: async (status?: 'ACTIVE' | 'ALL'): Promise<Category[]> => {
    const url = `/api/categories/tree${status === 'ACTIVE' ? '?status=ACTIVE' : ''}`;
    const res = await fetchAuthApi<{ success: boolean; data: Category[] }>(url, {
      method: 'GET',
    });
    return res.data || [];
  },

  getById: async (id: string): Promise<Category> => {
    const res = await fetchAuthApi<{ success: boolean; data: Category }>(`/api/categories/${id}`, {
      method: 'GET',
    });
    return res.data;
  },

  getChildren: async (id: string, activeOnly?: boolean): Promise<Category[]> => {
    const url = `/api/categories/${id}/children${activeOnly ? '?activeOnly=true' : ''}`;
    const res = await fetchAuthApi<{ success: boolean; data: Category[] }>(url, {
      method: 'GET',
    });
    return res.data || [];
  },

  getBreadcrumbs: async (id: string): Promise<{ id: string; name: string; slug: string }[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: { id: string; name: string; slug: string }[] }>(
      `/api/categories/${id}/breadcrumbs`,
      { method: 'GET' }
    );
    return res.data || [];
  },

  getBySeller: async (sellerId: string): Promise<Category[]> => {
    if (!sellerId || sellerId === 'all') return [];
    const res = await fetchAuthApi<{ success: boolean; data: Category[] }>(
      `/api/sellers/${sellerId}/marketplace-categories`,
      {
        method: 'GET',
      }
    );
    return (res.data || []).map((c) => ({
      ...c,
      icon: c.icon || 'bi-box-seam',
      status: c.isActive !== false ? 'ACTIVE' : 'INACTIVE',
      productCount: c.productCount || 0,
      createdAt: c.createdAt || new Date().toISOString().split('T')[0],
    }));
  },

  create: async (category: Partial<Category>): Promise<Category> => {
    const res = await fetchAuthApi<{ success: boolean; data: Category }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: category.name,
        slug: category.slug,
        parentId: category.parentId || null,
        icon: category.icon,
        description: category.description,
        imageUrl: category.imageUrl,
        sortOrder: category.sortOrder || 0,
        isActive: category.status !== 'INACTIVE' && category.isActive !== false,
      }),
    });
    if (!res.data) throw new Error('Failed to create category');
    return res.data;
  },

  update: async (id: string, updates: Partial<Category>): Promise<Category> => {
    const res = await fetchAuthApi<{ success: boolean; data: Category }>(`/api/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!res.data) throw new Error('Failed to update category');
    return res.data;
  },

  updateStatus: async (id: string, isActive: boolean): Promise<Category> => {
    const res = await fetchAuthApi<{ success: boolean; data: Category }>(`/api/categories/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    if (!res.data) throw new Error('Failed to update category status');
    return res.data;
  },

  move: async (id: string, targetParentId: string | null): Promise<Category> => {
    const res = await fetchAuthApi<{ success: boolean; data: Category }>(`/api/categories/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ targetParentId }),
    });
    if (!res.data) throw new Error('Failed to move category');
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetchAuthApi<{ success: boolean; message: string }>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  uploadImage: async (file: File): Promise<{ url: string; publicId: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetchAuthApi<{ success: boolean; data: { url: string; publicId: string } }>(
      '/api/categories/upload-image',
      {
        method: 'POST',
        body: formData,
      }
    );
    if (!res.data?.url) throw new Error('Failed to upload category image to storage');
    return res.data;
  },

  getAttributes: async (id: string): Promise<CategoryLocalAttributesResponse> => {
    const res = await fetchAuthApi<{ success: boolean; data: CategoryLocalAttributesResponse }>(
      `/api/categories/${id}/attributes`,
      { method: 'GET' }
    );
    if (!res.data) throw new Error('Failed to fetch category attributes');
    return res.data;
  },

  updateAttributes: async (
    id: string,
    payload: {
      attributes?: { attributeDefinitionId: string; isRequired?: boolean; isVisible?: boolean; sortOrder?: number; configuration?: any }[];
      logistics?: { weightMode?: string; unitOfMeasureMode?: string; defaultUnit?: string | null };
    }
  ): Promise<CategoryLocalAttributesResponse> => {
    const res = await fetchAuthApi<{ success: boolean; data: CategoryLocalAttributesResponse }>(
      `/api/categories/${id}/attributes`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
    if (!res.data) throw new Error('Failed to update category attributes');
    return res.data;
  },

  getEffectiveAttributes: async (id: string): Promise<EffectiveCategoryAttributes> => {
    const res = await fetchAuthApi<{ success: boolean; data: EffectiveCategoryAttributes }>(
      `/api/categories/${id}/effective-attributes`,
      { method: 'GET' }
    );
    if (!res.data) throw new Error('Failed to fetch effective category attributes');
    return res.data;
  },
};

export const attributesApi = {
  getAll: async (params?: { search?: string; type?: string; status?: string }): Promise<AttributeDefinition[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetchAuthApi<{ success: boolean; data: AttributeDefinition[] }>(
      `/api/attributes${queryString}`,
      { method: 'GET' }
    );
    return res.data || [];
  },

  getById: async (id: string): Promise<AttributeDefinition> => {
    const res = await fetchAuthApi<{ success: boolean; data: AttributeDefinition }>(
      `/api/attributes/${id}`,
      { method: 'GET' }
    );
    if (!res.data) throw new Error('Failed to fetch attribute definition');
    return res.data;
  },

  create: async (payload: {
    name: string;
    type: string;
    description?: string | null;
    unit?: string | null;
    options?: { label: string; value: string; sortOrder?: number }[];
  }): Promise<AttributeDefinition> => {
    const res = await fetchAuthApi<{ success: boolean; data: AttributeDefinition }>(
      '/api/attributes',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    if (!res.data) throw new Error('Failed to create attribute definition');
    return res.data;
  },

  update: async (
    id: string,
    payload: {
      name?: string;
      description?: string | null;
      unit?: string | null;
      options?: { id?: string; label: string; value: string; sortOrder?: number; status?: string }[];
    }
  ): Promise<AttributeDefinition> => {
    const res = await fetchAuthApi<{ success: boolean; data: AttributeDefinition }>(
      `/api/attributes/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
    if (!res.data) throw new Error('Failed to update attribute definition');
    return res.data;
  },

  deactivate: async (id: string): Promise<AttributeDefinition> => {
    const res = await fetchAuthApi<{ success: boolean; data: AttributeDefinition }>(
      `/api/attributes/${id}`,
      { method: 'DELETE' }
    );
    if (!res.data) throw new Error('Failed to deactivate attribute definition');
    return res.data;
  },
};

export const paymentMethodsApi = {
  getActive: async (): Promise<PaymentMethod[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: PaymentMethod[] }>('/api/payment-methods?active=true', {
      method: 'GET',
    });
    return res.data || [];
  },

  getAll: async (): Promise<PaymentMethod[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: PaymentMethod[] }>('/api/payment-methods', {
      method: 'GET',
    });
    return res.data || [];
  },

  create: async (data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
    const res = await fetchAuthApi<{ success: boolean; data: PaymentMethod }>('/api/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.data) throw new Error('Failed to create payment method');
    return res.data;
  },

  update: async (id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
    const res = await fetchAuthApi<{ success: boolean; data: PaymentMethod }>(`/api/payment-methods/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.data) throw new Error('Failed to update payment method');
    return res.data;
  },

  toggleStatus: async (id: string, isActive: boolean): Promise<PaymentMethod> => {
    const res = await fetchAuthApi<{ success: boolean; data: PaymentMethod }>(`/api/payment-methods/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    if (!res.data) throw new Error('Failed to toggle payment method status');
    return res.data;
  },
};

export const suppliersApi = {
  list: async (params: SupplierListParams = {}): Promise<SupplierListResult> => {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.city && params.city !== 'All Cities') queryParts.push(`city=${encodeURIComponent(params.city)}`);
    if (params.status && params.status !== 'ALL') queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.search && params.search.trim()) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await fetchAuthApi<{
      success: boolean;
      data: { items: Supplier[]; pagination: SupplierListResult['pagination'] };
    }>(`/api/suppliers${qs}`, {
      method: 'GET',
    });

    return {
      items: res.data?.items || [],
      pagination: res.data?.pagination || {
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  getAll: async (filterCity?: string): Promise<Supplier[]> => {
    let endpoint = '/api/suppliers?limit=100';
    if (filterCity && filterCity !== 'All Cities') {
      endpoint += `&city=${encodeURIComponent(filterCity)}`;
    }
    const res = await fetchAuthApi<{
      success: boolean;
      data: { items?: Supplier[] } | Supplier[];
    }>(endpoint, {
      method: 'GET',
    });
    return Array.isArray(res.data) ? res.data : (res.data?.items || []);
  },

  getById: async (id: string): Promise<Supplier> => {
    const res = await fetchAuthApi<{ success: boolean; data: Supplier }>(`/api/suppliers/${id}`, {
      method: 'GET',
    });
    if (!res.data) throw new Error('Supplier not found');
    return res.data;
  },

  register: async (supplier: CreateSupplierInput): Promise<Supplier> => {
    const payload: Record<string, unknown> = {
      name: supplier.name.trim(),
      companyName: supplier.companyName.trim(),
      phone: supplier.phone.trim(),
      city: supplier.city.trim(),
      address: supplier.address.trim(),
    };
    if (supplier.email && supplier.email.trim()) {
      payload.email = supplier.email.trim().toLowerCase();
    }
    if (supplier.category && supplier.category.trim()) {
      payload.category = supplier.category.trim();
    }
    if (supplier.tinNumber && supplier.tinNumber.trim()) {
      payload.tinNumber = supplier.tinNumber.trim();
    }
    if (Array.isArray(supplier.paymentMethods) && supplier.paymentMethods.length > 0) {
      payload.paymentMethods = supplier.paymentMethods.map((pm, idx) => ({
        paymentMethod: pm.paymentMethod.trim(),
        accountNumber: pm.accountNumber.trim(),
        isPrimary: pm.isPrimary ?? (idx === 0),
      }));
    }
    if (supplier.paymentMethodId && supplier.paymentMethodId.trim()) {
      payload.paymentMethodId = supplier.paymentMethodId.trim();
    }
    if (supplier.status) {
      payload.status = supplier.status;
    }
    if (supplier.notes && supplier.notes.trim()) {
      payload.notes = supplier.notes.trim();
    }

    const res = await fetchAuthApi<{ success: boolean; data: Supplier }>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.data) throw new Error('Failed to register supplier');
    return res.data;
  },

  update: async (id: string, updates: UpdateSupplierInput): Promise<Supplier> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.companyName !== undefined) payload.companyName = updates.companyName.trim();
    if (updates.phone !== undefined) payload.phone = updates.phone.trim();
    if (updates.city !== undefined) payload.city = updates.city.trim();
    if (updates.address !== undefined) payload.address = updates.address.trim();
    if (updates.email !== undefined) {
      payload.email = updates.email && updates.email.trim() ? updates.email.trim().toLowerCase() : null;
    }
    if (updates.category !== undefined) {
      payload.category = updates.category && updates.category.trim() ? updates.category.trim() : null;
    }
    if (updates.tinNumber !== undefined) {
      payload.tinNumber = updates.tinNumber && updates.tinNumber.trim() ? updates.tinNumber.trim() : null;
    }
    if (updates.notes !== undefined) {
      payload.notes = updates.notes && updates.notes.trim() ? updates.notes.trim() : null;
    }
    if (updates.status !== undefined) payload.status = updates.status;
    if (Array.isArray(updates.paymentMethods)) {
      payload.paymentMethods = updates.paymentMethods.map((pm, idx) => ({
        paymentMethod: pm.paymentMethod.trim(),
        accountNumber: pm.accountNumber.trim(),
        isPrimary: pm.isPrimary ?? (idx === 0),
      }));
    }
    if (updates.paymentMethodId !== undefined) {
      payload.paymentMethodId = updates.paymentMethodId;
    }

    const res = await fetchAuthApi<{ success: boolean; data: Supplier }>(`/api/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (!res.data) throw new Error('Failed to update supplier');
    return res.data;
  },

  toggleStatus: async (id: string, targetStatus?: string): Promise<Supplier> => {
    const res = await fetchAuthApi<{ success: boolean; data: Supplier }>(`/api/suppliers/${id}/status`, {
      method: 'PATCH',
      body: targetStatus ? JSON.stringify({ status: targetStatus }) : undefined,
    });
    if (!res.data) throw new Error('Failed to update supplier status');
    return res.data;
  },
};

// ==========================================
// 3. Operations: Customers (GET/POST /api/customers)
// ==========================================
function normalizeCustomer(r: any): Customer {
  const metrics = r.metrics || {
    totalOrders: Number(r.orderCount || 0),
    completedOrders: Number(r.orderCount || 0),
    cancelledOrders: 0,
    totalSpent: typeof r.totalSpendingEtb === 'number' ? r.totalSpendingEtb : 0,
    totalScore: Number(r.trustScore || 0),
  };

  const fullName = r.fullName || r.name || 'Customer';
  const status = (r.status || r.accountStatus || 'ACTIVE') as CustomerAccountStatus;
  const verificationStatus = (r.verificationStatus || 'PENDING') as CustomerVerificationStatus;

  return {
    id: String(r.id),
    customerCode: r.customerCode || `CUST-${String(r.id).slice(0, 6)}`,
    fullName,
    name: fullName,
    phone: String(r.phone || ''),
    email: r.email || '',
    profileImageUrl: r.profileImageUrl || null,
    city: r.city || 'Gondar',
    deliveryZone: r.deliveryZone || '',
    address: r.address || (r.addresses && r.addresses[0]?.addressLine) || '',
    status,
    accountStatus: status,
    verificationStatus,
    metrics: {
      totalOrders: Number(metrics.totalOrders || 0),
      completedOrders: Number(metrics.completedOrders || 0),
      cancelledOrders: Number(metrics.cancelledOrders || 0),
      totalSpent: metrics.totalSpent ?? '0.00',
      totalScore: Number(metrics.totalScore || 0),
    },
    orderCount: Number(metrics.totalOrders || 0),
    totalSpendingEtb: Number(metrics.totalSpent || 0),
    trustScore: Number(metrics.totalScore || 0),
    addresses: r.addresses || [],
    orders: r.orders || [],
    activities: r.activities || [],
    lastActivityAt: r.lastActivityAt || null,
    createdAt: String(r.createdAt || new Date().toISOString()),
    registeredAt: String(r.registeredAt || r.createdAt || new Date().toISOString()),
    lastOrderAt: r.lastOrderAt,
  };
}

export const customersApi = {
  list: async (params: CustomerListParams = {}): Promise<CustomerListResult> => {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.pageSize) queryParts.push(`pageSize=${params.pageSize}`);
    if (params.city && params.city !== 'All Cities') queryParts.push(`city=${encodeURIComponent(params.city)}`);
    if (params.deliveryZone && params.deliveryZone !== 'ALL') queryParts.push(`deliveryZone=${encodeURIComponent(params.deliveryZone)}`);
    if (params.status && params.status !== 'ALL') queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.verificationStatus && params.verificationStatus !== 'ALL') queryParts.push(`verificationStatus=${encodeURIComponent(params.verificationStatus)}`);
    if (params.search && params.search.trim()) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
    if (params.sortBy) queryParts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
    if (params.sortOrder) queryParts.push(`sortOrder=${encodeURIComponent(params.sortOrder)}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await fetchAuthApi<{
      success: boolean;
      data: any[];
      pagination: CustomerListResult['pagination'];
    }>(`/api/customers${qs}`, { method: 'GET' });

    const items = (res.data || []).map((c) => normalizeCustomer(c));
    return {
      items,
      pagination: res.pagination || {
        total: items.length,
        page: params.page || 1,
        pageSize: params.pageSize || 25,
        totalPages: Math.ceil(items.length / (params.pageSize || 25)) || 1,
      },
    };
  },

  getAll: async (filterCity?: string): Promise<Customer[]> => {
    const queryParts: string[] = ['pageSize=100'];
    if (filterCity && filterCity !== 'All Cities') queryParts.push(`city=${encodeURIComponent(filterCity)}`);

    const res = await fetchAuthApi<{
      success: boolean;
      data: any[];
    }>(`/api/customers?${queryParts.join('&')}`, { method: 'GET' });

    const rawList = Array.isArray(res.data) ? res.data : [];
    return rawList.map((c) => normalizeCustomer(c));
  },

  getSummary: async (): Promise<CustomerSummaryMetrics> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: CustomerSummaryMetrics;
    }>(`/api/customers/summary`, { method: 'GET' });

    return res.data || {
      totalCustomers: 0,
      activeCustomers: 0,
      newCustomers: 0,
      verifiedCustomers: 0,
    };
  },

  getById: async (id: string): Promise<Customer> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/customers/${id}`, { method: 'GET' });

    if (!res.data) throw new Error('Customer not found');
    return normalizeCustomer(res.data);
  },

  getOrders: async (id: string, params: { page?: number; pageSize?: number } = {}): Promise<{ items: any[]; pagination: any }> => {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.pageSize) queryParts.push(`pageSize=${params.pageSize}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const res = await fetchAuthApi<{
      success: boolean;
      data: any[];
      pagination: any;
    }>(`/api/customers/${id}/orders${qs}`, { method: 'GET' });

    return {
      items: res.data || [],
      pagination: res.pagination,
    };
  },

  getActivity: async (id: string, params: { page?: number; pageSize?: number } = {}): Promise<{ items: CustomerActivityItem[]; pagination: any }> => {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.pageSize) queryParts.push(`pageSize=${params.pageSize}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const res = await fetchAuthApi<{
      success: boolean;
      data: CustomerActivityItem[];
      pagination: any;
    }>(`/api/customers/${id}/activity${qs}`, { method: 'GET' });

    return {
      items: res.data || [],
      pagination: res.pagination,
    };
  },

  toggleStatus: async (id: string, currentStatus?: string): Promise<Customer> => {
    const targetStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/customers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: targetStatus }),
    });

    return normalizeCustomer(res.data);
  },

  updateStatus: async (id: string, status: CustomerAccountStatus): Promise<Customer> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/customers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    return normalizeCustomer(res.data);
  },

  bulkUpdateStatus: async (ids: string[], status: CustomerAccountStatus): Promise<number> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: { affectedCount: number };
    }>(`/api/customers/bulk-status`, {
      method: 'PATCH',
      body: JSON.stringify({ ids, status }),
    });

    return res.data?.affectedCount || ids.length;
  },

  update: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    const payload: Record<string, any> = {};
    if (data.fullName !== undefined) payload.fullName = data.fullName;
    if (data.name !== undefined && !data.fullName) payload.fullName = data.name;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.email !== undefined) payload.email = data.email;
    if (data.city !== undefined) payload.city = data.city;
    if (data.deliveryZone !== undefined) payload.deliveryZone = data.deliveryZone;
    if (data.profileImageUrl !== undefined) payload.profileImageUrl = data.profileImageUrl;
    if (data.verificationStatus !== undefined && data.verificationStatus !== 'UNVERIFIED') {
      payload.verificationStatus = data.verificationStatus;
    }

    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    return normalizeCustomer(res.data);
  },
};

// ==========================================
// 4. Operations: Orders (GET/POST /api/orders)
// ==========================================
// 4. Operations: Orders (GET/POST /api/orders)
// ==========================================
function normalizeOrder(raw: any): Order {
  if (!raw) throw new Error('Order data is missing');
  return {
    id: raw.id,
    orderNumber: raw.orderNumber || raw.id,
    customerId: raw.customerId,
    customerName: raw.customerName || raw.customer?.fullName || 'Customer',
    customerCode: raw.customerCode || raw.customer?.customerCode || '',
    customerPhone: raw.customerPhone || raw.customer?.phone || '',
    customerEmail: raw.customerEmail || raw.customer?.email || null,
    city: raw.city,
    deliveryZone: raw.deliveryZone || 'Standard Zone',
    deliveryAddress: raw.deliveryAddress || '',
    deliveryAddressSnapshot: raw.deliveryAddressSnapshot || null,
    items: (raw.items || []).map((it: any) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName || it.productNameSnapshot || 'Product',
      itemCode: it.itemCode || it.itemCodeSnapshot || '',
      unit: it.unit || it.unitSnapshot || '',
      sellerId: it.sellerId || it.sellerIdSnapshot,
      sellerName: it.sellerName || it.sellerNameSnapshot || 'Ardab Direct Hub',
      quantity: Number(it.quantity || 1),
      unitPriceEtb: Number(it.unitPriceEtb ?? it.unitPrice ?? 0),
      totalPriceEtb: Number(it.totalPriceEtb ?? it.subtotal ?? 0),
      unitWeightKg: Number(it.unitWeightKg ?? it.weightPerUnit ?? 0),
      totalWeightKg: Number(it.totalWeightKg ?? it.totalWeight ?? 0),
    })),
    subtotalEtb: Number(raw.subtotalEtb ?? raw.subtotal ?? 0),
    deliveryFeeEtb: Number(raw.deliveryFeeEtb ?? raw.deliveryFee ?? 0),
    discountEtb: Number(raw.discountEtb ?? raw.discountAmount ?? 0),
    taxEtb: Number(raw.taxEtb ?? raw.taxAmount ?? 0),
    totalEtb: Number(raw.totalEtb ?? raw.totalAmount ?? 0),
    totalWeightKg: Number(raw.totalWeightKg ?? raw.totalWeight ?? 0),
    currency: raw.currency || 'ETB',
    paymentMethod: raw.paymentMethod || 'CASH_ON_DELIVERY',
    paymentStatus: raw.paymentStatus || 'PENDING',
    orderStatus: (raw.status || raw.orderStatus || 'PENDING') as OrderStatus,
    customerNote: raw.customerNote || null,
    internalNote: raw.internalNote || null,
    placedAt: raw.placedAt || raw.createdAt,
    confirmedAt: raw.confirmedAt || null,
    processingAt: raw.processingAt || null,
    readyAt: raw.readyAt || null,
    dispatchedAt: raw.dispatchedAt || null,
    deliveredAt: raw.deliveredAt || null,
    cancelledAt: raw.cancelledAt || null,
    cancelledReason: raw.cancelledReason || null,
    rejectedAt: raw.rejectedAt || null,
    rejectedReason: raw.rejectedReason || null,
    assignedTripId: raw.assignedTripId,
    assignedVehicleId: raw.assignedVehicleId,
    assignedDriverName: raw.assignedDriverName,
    timeline: (raw.timeline || []).map((ev: any) => ({
      id: ev.id,
      status: (ev.status || 'PENDING') as OrderStatus,
      timestamp: ev.timestamp || 'Just now',
      description: ev.description || '',
      actor: ev.actor || 'System',
    })),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export const ordersApi = {
  list: async (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    city?: string;
    deliveryZone?: string;
    status?: string;
    paymentStatus?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<{ items: Order[]; pagination: any }> => {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.pageSize) queryParts.push(`pageSize=${params.pageSize}`);
    if (params.search && params.search.trim()) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
    if (params.city && params.city !== 'All Cities') queryParts.push(`city=${encodeURIComponent(params.city)}`);
    if (params.deliveryZone && params.deliveryZone !== 'All Zones') queryParts.push(`deliveryZone=${encodeURIComponent(params.deliveryZone)}`);
    if (params.status && params.status !== 'ALL') queryParts.push(`status=${params.status}`);
    if (params.paymentStatus && params.paymentStatus !== 'ALL') queryParts.push(`paymentStatus=${params.paymentStatus}`);
    if (params.sortBy) queryParts.push(`sortBy=${params.sortBy}`);
    if (params.sortOrder) queryParts.push(`sortOrder=${params.sortOrder}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await fetchAuthApi<{
      success: boolean;
      data: any[];
      pagination: any;
    }>(`/api/orders${qs}`, { method: 'GET' });

    return {
      items: (res.data || []).map(normalizeOrder),
      pagination: res.pagination,
    };
  },

  getAll: async (filterCity?: string, status?: OrderStatus | 'ALL'): Promise<Order[]> => {
    const queryParts: string[] = ['pageSize=100'];
    if (filterCity && filterCity !== 'All Cities') {
      queryParts.push(`city=${encodeURIComponent(filterCity)}`);
    }
    if (status && status !== 'ALL') {
      queryParts.push(`status=${status}`);
    }
    const qs = `?${queryParts.join('&')}`;
    const res = await fetchAuthApi<{
      success: boolean;
      data: any[];
      pagination: any;
    }>(`/api/orders${qs}`, { method: 'GET' });

    return (res.data || []).map(normalizeOrder);
  },

  getSummary: async (city?: string): Promise<OrderSummaryMetrics> => {
    const qs = city && city !== 'All Cities' ? `?city=${encodeURIComponent(city)}` : '';
    const res = await fetchAuthApi<{
      success: boolean;
      data: OrderSummaryMetrics;
    }>(`/api/orders/summary${qs}`, { method: 'GET' });

    return res.data || {
      totalOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      todayOrders: 0,
      confirmedOrders: 0,
      readyOrders: 0,
    };
  },

  getById: async (id: string): Promise<Order> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/orders/${id}`, { method: 'GET' });

    if (!res.data) throw new Error('Order not found');
    return normalizeOrder(res.data);
  },

  getActivity: async (id: string): Promise<OrderTimelineEvent[]> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: any[];
    }>(`/api/orders/${id}/activity`, { method: 'GET' });

    return (res.data || []).map((ev: any) => ({
      id: ev.id,
      status: ev.status || ev.toStatus || 'PENDING',
      timestamp: ev.timestamp,
      description: ev.description,
      actor: ev.actor,
    }));
  },

  updateStatus: async (id: string, newStatus: OrderStatus, reason?: string): Promise<Order> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus, reason }),
    });

    return normalizeOrder(res.data);
  },

  confirm: async (id: string): Promise<Order> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/orders/${id}/confirm`, { method: 'POST' });

    return normalizeOrder(res.data);
  },

  process: async (id: string): Promise<Order> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/orders/${id}/process`, { method: 'POST' });

    return normalizeOrder(res.data);
  },

  ready: async (id: string): Promise<Order> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/orders/${id}/ready`, { method: 'POST' });

    return normalizeOrder(res.data);
  },

  reject: async (id: string, reason: string): Promise<Order> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/orders/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    return normalizeOrder(res.data);
  },

  cancel: async (id: string, reason: string): Promise<Order> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: any;
    }>(`/api/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    return normalizeOrder(res.data);
  },

  bulkUpdateStatus: async (ids: string[], newStatus: OrderStatus, reason?: string): Promise<number> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: { count: number };
    }>(`/api/orders/bulk-status`, {
      method: 'POST',
      body: JSON.stringify({ ids, status: newStatus, reason }),
    });

    return res.data?.count || 0;
  },

  getPaginated: async (options: QueryOptions = {}): Promise<PaginatedResponse<Order>> => {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, search, city, status } = options;
    const result = await ordersApi.list({
      page,
      pageSize,
      search,
      city,
      status: status === 'ALL' ? undefined : status,
    });

    return {
      data: result.items,
      pagination: {
        page: result.pagination?.page || page,
        pageSize: result.pagination?.pageSize || pageSize,
        total: result.pagination?.total || result.items.length,
        totalPages: result.pagination?.totalPages || 1,
      },
    };
  },
};

// ==========================================
// 4.5. Delivery Fulfillment Operations (GET/POST /api/deliveries/*)
// ==========================================
export const deliveriesApi = {
  list: async (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    city?: string;
    deliveryZone?: string;
    status?: string;
    tripId?: string;
    driverId?: string;
    vehicleId?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<{ items: Delivery[]; pagination: any }> => {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.pageSize) queryParts.push(`pageSize=${params.pageSize}`);
    if (params.search && params.search.trim()) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
    if (params.city && params.city !== 'All Cities') queryParts.push(`city=${encodeURIComponent(params.city)}`);
    if (params.deliveryZone && params.deliveryZone !== 'All Zones') queryParts.push(`deliveryZone=${encodeURIComponent(params.deliveryZone)}`);
    if (params.status && params.status !== 'ALL') queryParts.push(`status=${params.status}`);
    if (params.tripId && params.tripId !== 'ALL') queryParts.push(`tripId=${params.tripId}`);
    if (params.driverId && params.driverId !== 'ALL') queryParts.push(`driverId=${params.driverId}`);
    if (params.vehicleId && params.vehicleId !== 'ALL') queryParts.push(`vehicleId=${params.vehicleId}`);
    if (params.sortBy) queryParts.push(`sortBy=${params.sortBy}`);
    if (params.sortOrder) queryParts.push(`sortOrder=${params.sortOrder}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await fetchAuthApi<{
      success: boolean;
      data: Delivery[];
      pagination: any;
    }>(`/api/deliveries${qs}`, { method: 'GET' });

    return {
      items: res.data || [],
      pagination: res.pagination,
    };
  },

  getSummary: async (city?: string): Promise<DeliverySummaryMetrics> => {
    const qs = city && city !== 'All Cities' ? `?city=${encodeURIComponent(city)}` : '';
    const res = await fetchAuthApi<{
      success: boolean;
      data: DeliverySummaryMetrics;
    }>(`/api/deliveries/summary${qs}`, { method: 'GET' });

    return (
      res.data || {
        totalDeliveries: 0,
        pendingDeliveries: 0,
        readyDeliveries: 0,
        assignedDeliveries: 0,
        outForDelivery: 0,
        deliveredToday: 0,
        failedDeliveries: 0,
        cancelledDeliveries: 0,
      }
    );
  },

  getById: async (id: string): Promise<Delivery> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: Delivery;
    }>(`/api/deliveries/${id}`, { method: 'GET' });

    if (!res.data) throw new Error('Delivery not found');
    return res.data;
  },

  getActivity: async (id: string): Promise<DeliveryTimelineEvent[]> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: DeliveryTimelineEvent[];
    }>(`/api/deliveries/${id}/activity`, { method: 'GET' });

    return res.data || [];
  },

  create: async (data: { orderId: string; scheduledAt?: string; deliveryNotes?: string }): Promise<Delivery> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: Delivery;
    }>('/api/deliveries', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!res.data) throw new Error('Failed to create delivery');
    return res.data;
  },

  prepare: async (id: string): Promise<Delivery> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: Delivery;
    }>(`/api/deliveries/${id}/prepare`, { method: 'POST' });

    if (!res.data) throw new Error('Failed to prepare delivery');
    return res.data;
  },

  assignTrip: async (id: string, tripId: string, scheduledAt?: string): Promise<Delivery> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: Delivery;
    }>(`/api/deliveries/${id}/assign-trip`, {
      method: 'POST',
      body: JSON.stringify({ tripId, scheduledAt }),
    });

    if (!res.data) throw new Error('Failed to assign delivery to trip');
    return res.data;
  },

  dispatch: async (id: string): Promise<Delivery> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: Delivery;
    }>(`/api/deliveries/${id}/dispatch`, { method: 'POST' });

    if (!res.data) throw new Error('Failed to dispatch delivery');
    return res.data;
  },

  complete: async (id: string, payload: { proofOfDeliveryUrl?: string; notes?: string } = {}): Promise<Delivery> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: Delivery;
    }>(`/api/deliveries/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.data) throw new Error('Failed to complete delivery');
    return res.data;
  },

  fail: async (id: string, reason: string, notes?: string): Promise<Delivery> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: Delivery;
    }>(`/api/deliveries/${id}/fail`, {
      method: 'POST',
      body: JSON.stringify({ reason, notes }),
    });

    if (!res.data) throw new Error('Failed to record delivery failure');
    return res.data;
  },

  cancel: async (id: string, reason: string): Promise<Delivery> => {
    const res = await fetchAuthApi<{
      success: boolean;
      data: Delivery;
    }>(`/api/deliveries/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    if (!res.data) throw new Error('Failed to cancel delivery');
    return res.data;
  },

  getAvailableTrips: async (city?: string): Promise<AvailableTrip[]> => {
    const qs = city && city !== 'All Cities' ? `?city=${encodeURIComponent(city)}` : '';
    const res = await fetchAuthApi<{
      success: boolean;
      data: AvailableTrip[];
    }>(`/api/deliveries/trips-available${qs}`, { method: 'GET' });

    return res.data || [];
  },
};

// ==========================================
// 5. Fleet Operations: Vehicles, Drivers, Trips (GET/POST /api/fleet/*)
// ==========================================
export const fleetApi = {
  getVehicles: async (filterCity?: string): Promise<Vehicle[]> => {
    await delay(80);
    if (filterCity && filterCity !== 'All Cities') {
      return mockVehicles.filter((v) => v.city === filterCity);
    }
    return [...mockVehicles];
  },

  getDrivers: async (filterCity?: string): Promise<Driver[]> => {
    await delay(80);
    if (filterCity && filterCity !== 'All Cities') {
      return mockDrivers.filter((d) => d.city === filterCity);
    }
    return [...mockDrivers];
  },

  getTrips: async (filterCity?: string, status?: TripStatus | 'ALL'): Promise<Trip[]> => {
    await delay(100);
    let results = [...mockTrips];
    if (filterCity && filterCity !== 'All Cities') {
      results = results.filter((t) => t.city === filterCity);
    }
    if (status && status !== 'ALL') {
      results = results.filter((t) => t.status === status);
    }
    return results;
  },

  updateTripStatus: async (id: string, newStatus: TripStatus): Promise<Trip> => {
    await delay(90);
    const trip = mockTrips.find((t) => t.id === id);
    if (trip) {
      trip.status = newStatus;
      return { ...trip };
    }
    throw new Error('Trip not found');
  },

  getPaginatedTrips: async (options: QueryOptions = {}): Promise<PaginatedResponse<Trip>> => {
    await delay(90);
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, search, city, status } = options;
    let results = [...mockTrips];

    if (city && city !== 'All Cities') {
      results = results.filter((t) => t.city === city);
    }
    if (status && status !== 'ALL') {
      results = results.filter((t) => t.status === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.vehicleRegistration.toLowerCase().includes(q) ||
          t.driverName.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          t.deliveryZones.some((z) => z.toLowerCase().includes(q))
      );
    }

    return paginateItems(results, page, pageSize);
  },
};

// ==========================================
// 6. Business: Finance & Reports (GET /api/finance, /api/reports)
// ==========================================
export const financeApi = {
  getMetrics: async (): Promise<RevenueMetrics> => {
    await delay(60);
    return { ...mockRevenueMetrics };
  },

  getTransactions: async (filterCity?: string): Promise<Transaction[]> => {
    await delay(80);
    if (filterCity && filterCity !== 'All Cities') {
      return mockTransactions.filter((t) => t.city === filterCity);
    }
    return [...mockTransactions];
  },
};

export const reportsApi = {
  getSalesByCity: async (): Promise<SalesByCity[]> => {
    await delay(80);
    return [...mockSalesByCity];
  },

  getSalesByCategory: async (): Promise<SalesByCategory[]> => {
    await delay(80);
    return [...mockSalesByCategory];
  },

  getOperationalPerformance: async (): Promise<OperationalPerformance> => {
    await delay(60);
    return { ...mockOperationalPerformance };
  },
};

// ==========================================
// 7. System: Notifications, Security, Settings (GET/POST /api/system/*)
// ==========================================
export const notificationsApi = {
  getSummary: async (): Promise<NotificationSummary> => {
    return fetchAuthApi<NotificationSummary>('/api/v1/admin/notifications/summary');
  },

  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Notification>> => {
    const queryStr = params
      ? '?' +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchAuthApi<PaginatedResponse<Notification>>(`/api/v1/admin/notifications${queryStr}`);
  },

  getById: async (id: string): Promise<Notification> => {
    return fetchAuthApi<Notification>(`/api/v1/admin/notifications/${id}`);
  },

  create: async (data: Record<string, unknown>): Promise<Notification> => {
    return fetchAuthApi<Notification>('/api/v1/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  markAsRead: async (id: string): Promise<Notification> => {
    return fetchAuthApi<Notification>(`/api/v1/admin/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: async (category?: string): Promise<{ updatedCount: number }> => {
    return fetchAuthApi<{ updatedCount: number }>('/api/v1/admin/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ category: category || 'ALL' }),
    });
  },

  bulkMarkAsRead: async (notificationIds: string[]): Promise<{ updatedCount: number }> => {
    return fetchAuthApi<{ updatedCount: number }>('/api/v1/admin/notifications/bulk-read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
  },

  acknowledgeAlert: async (id: string, notes?: string): Promise<Notification> => {
    return fetchAuthApi<Notification>(`/api/v1/admin/notifications/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  bulkAcknowledgeAlerts: async (notificationIds: string[], notes?: string): Promise<{ updatedCount: number }> => {
    return fetchAuthApi<{ updatedCount: number }>('/api/v1/admin/notifications/bulk-acknowledge', {
      method: 'POST',
      body: JSON.stringify({ notificationIds, notes }),
    });
  },
};

export const securityApi = {
  getStatistics: async (): Promise<SecurityStatistics> => {
    const res = await fetchAuthApi<{ success: boolean; data: SecurityStatistics }>(
      '/api/subadmin/security/statistics',
      { method: 'GET' }
    );
    return res.data;
  },

  getAdminUsers: async (): Promise<AdminUser[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: AdminUser[] }>(
      '/api/subadmin/security/super-admins?limit=100',
      { method: 'GET' }
    );
    return res.data || [];
  },

  getSuperAdminAccounts: async (params?: Record<string, unknown>): Promise<AdminUser[]> => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
          sp.append(k, String(v));
        }
      });
    }
    const query = sp.toString() ? `?${sp.toString()}` : '?limit=100';
    const res = await fetchAuthApi<{ success: boolean; data: AdminUser[] }>(
      `/api/subadmin/security/super-admins${query}`,
      { method: 'GET' }
    );
    return res.data || [];
  },

  getSuperAdminById: async (id: string): Promise<AdminUser> => {
    const res = await fetchAuthApi<{ success: boolean; data: AdminUser }>(
      `/api/subadmin/security/super-admins/${id}`,
      { method: 'GET' }
    );
    return res.data;
  },

  createSuperAdminAccount: async (data: {
    name: string;
    email: string;
    phone?: string;
    assignedCities: string[];
    initialPassword?: string;
  }): Promise<AdminUser> => {
    const res = await fetchAuthApi<{ success: boolean; data: AdminUser }>(
      '/api/subadmin/security/super-admins',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  updateSuperAdminAccount: async (id: string, data: Partial<AdminUser>): Promise<AdminUser> => {
    const res = await fetchAuthApi<{ success: boolean; data: AdminUser }>(
      `/api/subadmin/security/super-admins/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  toggleSuperAdminStatus: async (id: string, reason?: string): Promise<AdminUser> => {
    const res = await fetchAuthApi<{ success: boolean; data: AdminUser }>(
      `/api/subadmin/security/super-admins/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      }
    );
    return res.data;
  },

  resetSuperAdminPassword: async (id: string): Promise<{ success: boolean; tempPassword: string }> => {
    const res = await fetchAuthApi<{ success: boolean; data: { success: boolean; tempPassword: string } }>(
      `/api/subadmin/security/super-admins/${id}/reset-password`,
      { method: 'POST' }
    );
    return res.data;
  },

  deleteSuperAdminAccount: async (id: string): Promise<boolean> => {
    await fetchAuthApi<{ success: boolean }>(
      `/api/subadmin/security/super-admins/${id}`,
      { method: 'DELETE' }
    );
    return true;
  },

  getActiveSessions: async (): Promise<ActiveSession[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: ActiveSession[] }>(
      '/api/subadmin/security/sessions',
      { method: 'GET' }
    );
    return res.data || [];
  },

  revokeSession: async (id: string): Promise<ActiveSession> => {
    const res = await fetchAuthApi<{ success: boolean; data: ActiveSession }>(
      `/api/subadmin/security/sessions/${id}/revoke`,
      { method: 'POST' }
    );
    return res.data;
  },

  getSecurityAlerts: async (): Promise<SecurityAlert[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: SecurityAlert[] }>(
      '/api/subadmin/security/alerts?limit=100',
      { method: 'GET' }
    );
    return res.data || [];
  },

  resolveAlert: async (id: string, resolutionNotes?: string): Promise<SecurityAlert> => {
    const res = await fetchAuthApi<{ success: boolean; data: SecurityAlert }>(
      `/api/subadmin/security/alerts/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RESOLVED', action: 'RESOLVE', resolutionNotes }),
      }
    );
    return res.data;
  },

  getIpRules: async (): Promise<IpBlockRule[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: IpBlockRule[] }>(
      '/api/subadmin/security/ip-rules',
      { method: 'GET' }
    );
    return res.data || [];
  },

  addIpRule: async (rule: Omit<IpBlockRule, 'id'>): Promise<IpBlockRule> => {
    const res = await fetchAuthApi<{ success: boolean; data: IpBlockRule }>(
      '/api/subadmin/security/ip-rules',
      {
        method: 'POST',
        body: JSON.stringify(rule),
      }
    );
    return res.data;
  },

  deleteIpRule: async (id: string): Promise<void> => {
    await fetchAuthApi<{ success: boolean }>(
      `/api/subadmin/security/ip-rules/${id}`,
      { method: 'DELETE' }
    );
  },

  getFailedLogins: async (): Promise<FailedLoginLog[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: FailedLoginLog[] }>(
      '/api/subadmin/security/failed-logins?limit=100',
      { method: 'GET' }
    );
    return res.data || [];
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: AuditLog[] }>(
      '/api/subadmin/security/audit-logs?limit=100',
      { method: 'GET' }
    );
    return res.data || [];
  },

  getEvents: async (params?: Record<string, unknown>): Promise<PaginatedResponse<SecurityEventItem>> => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          sp.append(k, String(v));
        }
      });
    }
    const query = sp.toString() ? `?${sp.toString()}` : '';
    const res = await fetchAuthApi<{ success: boolean; data: SecurityEventItem[]; pagination: any }>(
      `/api/subadmin/security/events${query}`,
      { method: 'GET' }
    );
    return {
      data: res.data || [],
      pagination: res.pagination || { page: 1, pageSize: 20, total: (res.data || []).length, totalPages: 1 },
    };
  },
};

// ==========================================
// 8. Sub Admin Services (Support, Maintenance, Feedback)
// ==========================================
export interface SupportListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  city?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SupportListResult {
  items: SupportTicket[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const supportApi = {
  getAll: async (params?: SupportListParams | string, statusParam?: string): Promise<SupportTicket[]> => {
    let query = '';
    if (typeof params === 'string') {
      const sp = new URLSearchParams();
      if (params && params !== 'All Cities') sp.append('city', params);
      if (statusParam && statusParam !== 'ALL') sp.append('status', statusParam);
      query = sp.toString() ? `?${sp.toString()}` : '';
    } else if (params) {
      const sp = new URLSearchParams();
      if (params.page) sp.append('page', String(params.page));
      if (params.pageSize) sp.append('pageSize', String(params.pageSize));
      if (params.search) sp.append('search', params.search);
      if (params.status && params.status !== 'ALL') sp.append('status', params.status);
      if (params.priority && params.priority !== 'ALL') sp.append('priority', params.priority);
      if (params.category && params.category !== 'ALL') sp.append('category', params.category);
      if (params.assignedTo) sp.append('assignedTo', params.assignedTo);
      if (params.city && params.city !== 'All Cities') sp.append('city', params.city);
      if (params.sortBy) sp.append('sortBy', params.sortBy);
      if (params.sortOrder) sp.append('sortOrder', params.sortOrder);
      query = sp.toString() ? `?${sp.toString()}` : '';
    }

    const res = await fetchAuthApi<{ success: boolean; data: SupportTicket[]; pagination?: any }>(
      `/api/subadmin/support/tickets${query}`,
      { method: 'GET' }
    );
    return res.data || [];
  },

  getList: async (params: SupportListParams): Promise<SupportListResult> => {
    const sp = new URLSearchParams();
    if (params.page) sp.append('page', String(params.page));
    if (params.pageSize) sp.append('pageSize', String(params.pageSize));
    if (params.search) sp.append('search', params.search);
    if (params.status && params.status !== 'ALL') sp.append('status', params.status);
    if (params.priority && params.priority !== 'ALL') sp.append('priority', params.priority);
    if (params.category && params.category !== 'ALL') sp.append('category', params.category);
    if (params.assignedTo) sp.append('assignedTo', params.assignedTo);
    if (params.city && params.city !== 'All Cities') sp.append('city', params.city);
    if (params.sortBy) sp.append('sortBy', params.sortBy);
    if (params.sortOrder) sp.append('sortOrder', params.sortOrder);
    const query = sp.toString() ? `?${sp.toString()}` : '';

    const res = await fetchAuthApi<{ success: boolean; data: SupportTicket[]; pagination: any }>(
      `/api/subadmin/support/tickets${query}`,
      { method: 'GET' }
    );
    return {
      items: res.data || [],
      pagination: res.pagination || { page: 1, pageSize: 20, total: (res.data || []).length, totalPages: 1 },
    };
  },

  getStatistics: async (city?: string): Promise<SupportStatistics> => {
    const query = city && city !== 'All Cities' ? `?city=${encodeURIComponent(city)}` : '';
    const res = await fetchAuthApi<{ success: boolean; data: SupportStatistics }>(
      `/api/subadmin/support/statistics${query}`,
      { method: 'GET' }
    );
    return res.data;
  },

  getCategories: async (): Promise<SupportCategory[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: SupportCategory[] }>(
      '/api/subadmin/support/categories',
      { method: 'GET' }
    );
    return res.data || [];
  },

  getById: async (id: string): Promise<SupportTicket | undefined> => {
    const res = await fetchAuthApi<{ success: boolean; data: SupportTicket }>(
      `/api/subadmin/support/tickets/${id}`,
      { method: 'GET' }
    );
    return res.data;
  },

  create: async (payload: {
    customerId: string;
    subject: string;
    description?: string;
    categoryId?: string;
    priority?: string;
    city?: string;
    orderId?: string;
  }): Promise<SupportTicket> => {
    const res = await fetchAuthApi<{ success: boolean; data: SupportTicket }>(
      '/api/subadmin/support/tickets',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  reply: async (ticketId: string, body: string, idempotencyKey?: string): Promise<{ message: any; emailDelivery: any }> => {
    const res = await fetchAuthApi<{ success: boolean; data: { message: any; emailDelivery: any } }>(
      `/api/subadmin/support/tickets/${ticketId}/reply`,
      {
        method: 'POST',
        body: JSON.stringify({ body, idempotencyKey }),
      }
    );
    return res.data;
  },

  addInternalNote: async (ticketId: string, body: string): Promise<any> => {
    const res = await fetchAuthApi<{ success: boolean; data: any }>(
      `/api/subadmin/support/tickets/${ticketId}/internal-note`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      }
    );
    return res.data;
  },

  updateStatus: async (id: string, status: TicketStatus, notes?: string): Promise<SupportTicket> => {
    const res = await fetchAuthApi<{ success: boolean; data: SupportTicket }>(
      `/api/subadmin/support/tickets/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      }
    );
    return res.data;
  },

  assign: async (id: string, assignedSubadminId: string | null): Promise<SupportTicket> => {
    const res = await fetchAuthApi<{ success: boolean; data: SupportTicket }>(
      `/api/subadmin/support/tickets/${id}/assign`,
      {
        method: 'PATCH',
        body: JSON.stringify({ assignedSubadminId }),
      }
    );
    return res.data;
  },

  retryEmail: async (ticketId: string, emailLogId: string): Promise<{ success: boolean; attempts: number }> => {
    const res = await fetchAuthApi<{ success: boolean; data: { success: boolean; attempts: number } }>(
      `/api/subadmin/support/tickets/${ticketId}/emails/${emailLogId}/retry`,
      {
        method: 'POST',
      }
    );
    return res.data;
  },

  // Backward compatibility wrapper for existing callers
  addMessage: async (ticketId: string, message: string): Promise<SupportTicket> => {
    await supportApi.reply(ticketId, message);
    const updated = await supportApi.getById(ticketId);
    return updated!;
  },
};

export const maintenanceApi = {
  /**
   * GET /api/admin/maintenance/services
   * List system components (live health status).
   */
  getServices: async (): Promise<SystemService[]> => {
    try {
      const res = await fetchAuthApi<{ success: boolean; data: SystemService[] }>(
        '/api/admin/maintenance/services',
        { method: 'GET' }
      );
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * GET /api/admin/maintenance/windows
   * List maintenance windows with optional filters.
   */
  getMaintenanceWindows: async (params?: Record<string, unknown>): Promise<MaintenanceWindow[]> => {
    try {
      const sp = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '' && v !== 'ALL') sp.append(k, String(v));
        });
      }
      sp.set('limit', '100');
      const res = await fetchAuthApi<{ success: boolean; data: MaintenanceWindow[] }>(
        `/api/admin/maintenance/windows?${sp.toString()}`,
        { method: 'GET' }
      );
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * POST /api/admin/maintenance/windows
   * Create a new maintenance window.
   */
  createWindow: async (window: Omit<MaintenanceWindow, 'id'>): Promise<MaintenanceWindow> => {
    const res = await fetchAuthApi<{ success: boolean; data: MaintenanceWindow }>(
      '/api/admin/maintenance/windows',
      { method: 'POST', body: JSON.stringify(window) }
    );
    return res.data;
  },

  /**
   * PATCH /api/admin/maintenance/windows/:id/status
   * Update a maintenance window's status.
   */
  updateWindowStatus: async (id: string, status: MaintenanceWindow['status']): Promise<MaintenanceWindow> => {
    const res = await fetchAuthApi<{ success: boolean; data: MaintenanceWindow }>(
      `/api/admin/maintenance/windows/${id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) }
    );
    return res.data;
  },

  /**
   * GET /api/admin/maintenance/tasks
   * List all maintenance/optimization tasks.
   */
  getTasks: async (): Promise<MaintenanceTask[]> => {
    try {
      const res = await fetchAuthApi<{ success: boolean; data: MaintenanceTask[] }>(
        '/api/admin/maintenance/tasks',
        { method: 'GET' }
      );
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * POST /api/admin/maintenance/tasks/:id/run
   * Manually trigger a maintenance task.
   */
  runTask: async (id: string): Promise<MaintenanceTask> => {
    const res = await fetchAuthApi<{ success: boolean; data: MaintenanceTask }>(
      `/api/admin/maintenance/tasks/${id}/run`,
      { method: 'POST' }
    );
    return res.data;
  },

  /**
   * GET /api/admin/maintenance/fleet
   * List fleet equipment service logs, optionally filtered by city name.
   */
  getEquipmentLogs: async (city?: string): Promise<EquipmentServiceLog[]> => {
    try {
      const sp = new URLSearchParams();
      if (city && city !== 'All Cities') sp.set('cityName', city);
      sp.set('limit', '100');
      const res = await fetchAuthApi<{ success: boolean; data: EquipmentServiceLog[] }>(
        `/api/admin/maintenance/fleet?${sp.toString()}`,
        { method: 'GET' }
      );
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * GET /api/admin/maintenance/statistics
   * Maintenance dashboard KPI statistics.
   */
  getStatistics: async () => {
    try {
      const res = await fetchAuthApi<{ success: boolean; data: Record<string, unknown> }>(
        '/api/admin/maintenance/statistics',
        { method: 'GET' }
      );
      return res.data || {};
    } catch {
      return {};
    }
  },
};

export const feedbackApi = {
  getAll: async (type?: string, city?: string): Promise<FeedbackItem[]> => {
    const sp = new URLSearchParams();
    if (type && type !== 'ALL') sp.append('type', type);
    if (city && city !== 'All Cities') sp.append('city', city);
    sp.append('limit', '100');
    const query = sp.toString() ? `?${sp.toString()}` : '';

    const res = await fetchAuthApi<{ success: boolean; data: FeedbackItem[] }>(
      `/api/subadmin/feedback${query}`,
      { method: 'GET' }
    );
    return res.data || [];
  },

  getList: async (params?: Record<string, unknown>): Promise<PaginatedResponse<FeedbackItem>> => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 'ALL' && v !== 'All Cities') {
          sp.append(k, String(v));
        }
      });
    }
    const query = sp.toString() ? `?${sp.toString()}` : '';

    const res = await fetchAuthApi<{ success: boolean; data: FeedbackItem[]; pagination: any }>(
      `/api/subadmin/feedback${query}`,
      { method: 'GET' }
    );
    return {
      data: res.data || [],
      pagination: res.pagination || { page: 1, pageSize: 20, total: (res.data || []).length, totalPages: 1 },
    };
  },

  getById: async (id: string): Promise<FeedbackItem> => {
    const res = await fetchAuthApi<{ success: boolean; data: FeedbackItem }>(
      `/api/subadmin/feedback/${id}`,
      { method: 'GET' }
    );
    return res.data;
  },

  getMetrics: async (city?: string): Promise<FeedbackMetrics> => {
    const query = city && city !== 'All Cities' ? `?city=${encodeURIComponent(city)}` : '';
    const res = await fetchAuthApi<{ success: boolean; data: FeedbackMetrics }>(
      `/api/subadmin/feedback/statistics${query}`,
      { method: 'GET' }
    );
    return res.data;
  },

  getReputation: async (city?: string): Promise<FeedbackMetrics> => {
    const query = city && city !== 'All Cities' ? `?city=${encodeURIComponent(city)}` : '';
    const res = await fetchAuthApi<{ success: boolean; data: FeedbackMetrics }>(
      `/api/subadmin/feedback/reputation${query}`,
      { method: 'GET' }
    );
    return res.data;
  },

  getCategories: async (): Promise<FeedbackCategory[]> => {
    const res = await fetchAuthApi<{ success: boolean; data: FeedbackCategory[] }>(
      '/api/subadmin/feedback/categories',
      { method: 'GET' }
    );
    return res.data || [];
  },

  create: async (payload: Record<string, unknown>): Promise<FeedbackItem> => {
    const res = await fetchAuthApi<{ success: boolean; data: FeedbackItem }>(
      '/api/subadmin/feedback',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  updateStatus: async (id: string, status: FeedbackStatus, reason?: string): Promise<FeedbackItem> => {
    const res = await fetchAuthApi<{ success: boolean; data: FeedbackItem }>(
      `/api/subadmin/feedback/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }
    );
    return res.data;
  },

  replyToFeedback: async (id: string, reply: string): Promise<FeedbackItem> => {
    const res = await fetchAuthApi<{ success: boolean; data: FeedbackItem }>(
      `/api/subadmin/feedback/${id}/responses`,
      {
        method: 'POST',
        body: JSON.stringify({ body: reply }),
      }
    );
    return res.data;
  },

  moderate: async (id: string, action: FeedbackModerationAction, reason?: string): Promise<FeedbackItem> => {
    const res = await fetchAuthApi<{ success: boolean; data: FeedbackItem }>(
      `/api/subadmin/feedback/${id}/moderate`,
      {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      }
    );
    return res.data;
  },

  report: async (id: string, payload: Record<string, unknown>): Promise<FeedbackReportItem> => {
    const res = await fetchAuthApi<{ success: boolean; data: FeedbackReportItem }>(
      `/api/subadmin/feedback/${id}/reports`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  getReports: async (params?: Record<string, unknown>): Promise<PaginatedResponse<FeedbackReportItem>> => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
      });
    }
    const query = sp.toString() ? `?${sp.toString()}` : '';

    const res = await fetchAuthApi<{ success: boolean; data: FeedbackReportItem[]; pagination: any }>(
      `/api/subadmin/feedback/reports${query}`,
      { method: 'GET' }
    );
    return {
      data: res.data || [],
      pagination: res.pagination || { page: 1, pageSize: 20, total: (res.data || []).length, totalPages: 1 },
    };
  },

  reviewReport: async (reportId: string, action: 'DISMISS' | 'TAKE_ACTION', actionTaken?: string): Promise<FeedbackReportItem> => {
    const res = await fetchAuthApi<{ success: boolean; data: FeedbackReportItem }>(
      `/api/subadmin/feedback/reports/${reportId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action, actionTaken }),
      }
    );
    return res.data;
  },
};

export const settingsApi = {
  getCities: async (): Promise<CityConfig[]> => {
    await delay(70);
    return [...mockCitiesConfig];
  },

  getPlatformSettings: async (): Promise<PlatformSettings> => {
    await delay(50);
    return { ...mockPlatformSettings };
  },

  updatePlatformSettings: async (settings: Partial<PlatformSettings>): Promise<PlatformSettings> => {
    await delay(120);
    Object.assign(mockPlatformSettings, settings);
    return { ...mockPlatformSettings };
  },
};

// ==============================================================================
// Operational Cities API
// ==============================================================================

export interface OperationalCity {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  timezone: string;
  openIncidents?: number;
  activeMaintenance?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const citiesApi = {
  /**
   * GET /api/admin/cities
   * List all operational cities.
   */
  list: async (includeInactive = false): Promise<OperationalCity[]> => {
    try {
      const query = includeInactive ? '?includeInactive=true' : '';
      const res = await fetchAuthApi<{ success: boolean; data: OperationalCity[] }>(
        `/api/admin/cities${query}`,
        { method: 'GET' }
      );
      return res.data || [];
    } catch {
      // Fallback to static city list if backend unavailable
      return [
        { id: 'gdr', name: 'Gondar', code: 'GDR', isActive: true, timezone: 'Africa/Addis_Ababa' },
        { id: 'bjr', name: 'Bahir Dar', code: 'BJR', isActive: true, timezone: 'Africa/Addis_Ababa' },
        { id: 'add', name: 'Addis Ababa', code: 'ADD', isActive: true, timezone: 'Africa/Addis_Ababa' },
      ];
    }
  },

  /**
   * GET /api/admin/cities/health
   * Get incident + maintenance counts per city.
   */
  getHealthOverview: async (): Promise<OperationalCity[]> => {
    try {
      const res = await fetchAuthApi<{ success: boolean; data: OperationalCity[] }>(
        '/api/admin/cities/health',
        { method: 'GET' }
      );
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Get city names as simple string array for dropdowns.
   * Returns ['All Cities', 'Gondar', 'Bahir Dar', ...]
   */
  getCityNames: async (): Promise<string[]> => {
    const cities = await citiesApi.list();
    return ['All Cities', ...cities.filter((c) => c.isActive).map((c) => c.name)];
  },
};

// ==============================================================================
// Global Search API
// ==============================================================================

export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
  createdAt?: string;
}

export interface GlobalSearchResponse {
  query: string;
  results: Record<string, SearchResultItem[]>;
  totalMatches: number;
}

export const searchApi = {
  /**
   * GET /api/admin/search?q=<query>
   * Federated global search across orders, customers, deliveries, etc.
   */
  search: async (query: string, options?: { limit?: number; types?: string[] }): Promise<GlobalSearchResponse> => {
    if (!query || query.trim().length < 2) {
      return { query, results: {}, totalMatches: 0 };
    }

    const sp = new URLSearchParams();
    sp.set('q', query.trim());
    if (options?.limit) sp.set('limit', String(options.limit));
    if (options?.types?.length) sp.set('types', options.types.join(','));

    try {
      const res = await fetchAuthApi<{ success: boolean; data: GlobalSearchResponse }>(
        `/api/admin/search?${sp.toString()}`,
        { method: 'GET' }
      );
      return res.data || { query, results: {}, totalMatches: 0 };
    } catch {
      return { query, results: {}, totalMatches: 0 };
    }
  },
};
