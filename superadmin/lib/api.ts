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
  mockProducts,
  mockSuppliers,
  mockCategories,
  mockCustomers,
  mockOrders,
  mockVehicles,
  mockDrivers,
  mockTrips,
  mockRevenueMetrics,
  mockTransactions,
  mockSalesByCity,
  mockSalesByCategory,
  mockOperationalPerformance,
  mockNotifications,
  mockAdminUsers,
  mockAuditLogs,
  mockCitiesConfig,
  mockPlatformSettings,
  mockSupportTickets,
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
import { Product, Category } from '@/types/product';
import { Supplier } from '@/types/supplier';
import { Customer } from '@/types/customer';
import { Order, OrderStatus } from '@/types/order';
import { Vehicle } from '@/types/vehicle';
import { Driver } from '@/types/driver';
import { Trip, TripStatus } from '@/types/trip';
import { RevenueMetrics, Transaction } from '@/types/finance';
import { SalesByCity, SalesByCategory, OperationalPerformance } from '@/types/report';
import { NotificationItem } from '@/types/notification';
import { AdminUser, AuditLog, ActiveSession, SecurityAlert, IpBlockRule, FailedLoginLog } from '@/types/security';
import { CityConfig, PlatformSettings } from '@/types/settings';
import { SupportTicket, TicketStatus } from '@/types/support';
import { SystemService, MaintenanceWindow, MaintenanceTask, EquipmentServiceLog } from '@/types/maintenance';
import { FeedbackItem, FeedbackMetrics, FeedbackStatus } from '@/types/feedback';

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
};

export const getAuthToken = (): string | null => {
  return inMemoryToken;
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
  };
}

async function fetchAuthApi<T = BackendAuthPayload>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (inMemoryToken) {
    headers['Authorization'] = `Bearer ${inMemoryToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiResponseError('Unable to connect to Ardab Market authentication server. Please check your connection.', 503, 'NETWORK_ERROR');
  }

  let data: BackendAuthPayload;
  try {
    data = (await response.json()) as BackendAuthPayload;
  } catch {
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
export const productsApi = {
  getAll: async (filterCity?: string, categoryId?: string): Promise<Product[]> => {
    await delay(80);
    let results = [...mockProducts];
    if (filterCity && filterCity !== 'All Cities') {
      results = results.filter((p) => p.cityAvailability.includes(filterCity));
    }
    if (categoryId && categoryId !== 'all') {
      results = results.filter((p) => p.categoryId === categoryId);
    }
    return results;
  },

  getById: async (id: string): Promise<Product | undefined> => {
    await delay(50);
    return mockProducts.find((p) => p.id === id);
  },

  create: async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    await delay(120);
    const newProduct: Product = {
      ...product,
      id: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockProducts.unshift(newProduct);
    return newProduct;
  },

  update: async (id: string, updates: Partial<Product>): Promise<Product> => {
    await delay(100);
    const index = mockProducts.findIndex((p) => p.id === id);
    if (index !== -1) {
      mockProducts[index] = { ...mockProducts[index], ...updates, updatedAt: new Date().toISOString() };
      return mockProducts[index];
    }
    throw new Error('Product not found');
  },

  toggleStatus: async (id: string): Promise<Product> => {
    await delay(80);
    const item = mockProducts.find((p) => p.id === id);
    if (item) {
      item.status = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      return item;
    }
    throw new Error('Product not found');
  },

  getPaginated: async (options: QueryOptions = {}): Promise<PaginatedResponse<Product>> => {
    await delay(90);
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, search, city, category, status } = options;
    let results = [...mockProducts];

    if (city && city !== 'All Cities') {
      results = results.filter((p) => p.cityAvailability.includes(city));
    }
    if (category && category !== 'all') {
      results = results.filter((p) => p.categoryId === category);
    }
    if (status && status !== 'ALL') {
      results = results.filter((p) => p.status === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.sellerName && p.sellerName.toLowerCase().includes(q))
      );
    }

    return paginateItems(results, page, pageSize);
  },

  bulkUpdateStatus: async (ids: string[], status: 'ACTIVE' | 'INACTIVE'): Promise<number> => {
    await delay(120);
    let count = 0;
    mockProducts.forEach((p) => {
      if (ids.includes(p.id)) {
        p.status = status;
        p.updatedAt = new Date().toISOString();
        count++;
      }
    });
    return count;
  },
};

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    await delay(60);
    return [...mockCategories];
  },

  create: async (category: Omit<Category, 'id' | 'createdAt' | 'productCount'>): Promise<Category> => {
    await delay(100);
    const newCat: Category = {
      ...category,
      id: `CAT-${String(mockCategories.length + 1).padStart(2, '0')}`,
      productCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    mockCategories.push(newCat);
    return newCat;
  },
};

export const suppliersApi = {
  getAll: async (filterCity?: string): Promise<Supplier[]> => {
    await delay(70);
    if (filterCity && filterCity !== 'All Cities') {
      return mockSuppliers.filter((s) => s.city === filterCity);
    }
    return [...mockSuppliers];
  },

  getById: async (id: string): Promise<Supplier | undefined> => {
    await delay(50);
    return mockSuppliers.find((s) => s.id === id);
  },

  register: async (supplier: Omit<Supplier, 'id' | 'productCount' | 'registeredAt'>): Promise<Supplier> => {
    await delay(120);
    const newSupplier: Supplier = {
      ...supplier,
      id: `SUP-${String(mockSuppliers.length + 1).padStart(3, '0')}`,
      productCount: 0,
      registeredAt: new Date().toISOString().split('T')[0],
    };
    mockSuppliers.unshift(newSupplier);
    return newSupplier;
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
    await delay(100);
    const index = mockSuppliers.findIndex((s) => s.id === id);
    if (index !== -1) {
      mockSuppliers[index] = { ...mockSuppliers[index], ...updates };
      return mockSuppliers[index];
    }
    throw new Error('Supplier not found');
  },

  toggleStatus: async (id: string): Promise<Supplier> => {
    await delay(80);
    const supplier = mockSuppliers.find((s) => s.id === id);
    if (supplier) {
      supplier.status = supplier.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      return supplier;
    }
    throw new Error('Supplier not found');
  },
};

// ==========================================
// 3. Operations: Customers (GET/POST /api/customers)
// ==========================================
export const customersApi = {
  getAll: async (filterCity?: string): Promise<Customer[]> => {
    await delay(80);
    if (filterCity && filterCity !== 'All Cities') {
      return mockCustomers.filter((c) => c.city === filterCity);
    }
    return [...mockCustomers];
  },

  toggleStatus: async (id: string): Promise<Customer> => {
    await delay(80);
    const customer = mockCustomers.find((c) => c.id === id);
    if (customer) {
      customer.accountStatus = customer.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      return customer;
    }
    throw new Error('Customer not found');
  },

  getPaginated: async (options: QueryOptions = {}): Promise<PaginatedResponse<Customer>> => {
    await delay(80);
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, search, city, status } = options;
    let results = [...mockCustomers];

    if (city && city !== 'All Cities') {
      results = results.filter((c) => c.city === city);
    }
    if (status && status !== 'ALL') {
      results = results.filter((c) => c.accountStatus === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.deliveryZone.toLowerCase().includes(q)
      );
    }

    return paginateItems(results, page, pageSize);
  },

  bulkUpdateStatus: async (ids: string[], status: 'ACTIVE' | 'SUSPENDED'): Promise<number> => {
    await delay(100);
    let count = 0;
    mockCustomers.forEach((c) => {
      if (ids.includes(c.id)) {
        c.accountStatus = status;
        count++;
      }
    });
    return count;
  },
};

// ==========================================
// 4. Operations: Orders (GET/POST /api/orders)
// ==========================================
export const ordersApi = {
  getAll: async (filterCity?: string, status?: OrderStatus | 'ALL'): Promise<Order[]> => {
    await delay(100);
    let results = [...mockOrders];
    if (filterCity && filterCity !== 'All Cities') {
      results = results.filter((o) => o.city === filterCity);
    }
    if (status && status !== 'ALL') {
      results = results.filter((o) => o.orderStatus === status);
    }
    return results;
  },

  getById: async (id: string): Promise<Order | undefined> => {
    await delay(50);
    return mockOrders.find((o) => o.id === id);
  },

  updateStatus: async (id: string, newStatus: OrderStatus): Promise<Order> => {
    await delay(100);
    const order = mockOrders.find((o) => o.id === id);
    if (order) {
      order.orderStatus = newStatus;
      order.timeline.push({
        status: newStatus,
        timestamp: 'Just now',
        description: `Order status updated to ${newStatus} by Super Admin`,
        actor: 'Super Admin',
      });
      return order;
    }
    throw new Error('Order not found');
  },

  getPaginated: async (options: QueryOptions = {}): Promise<PaginatedResponse<Order>> => {
    await delay(90);
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, search, city, status } = options;
    let results = [...mockOrders];

    if (city && city !== 'All Cities') {
      results = results.filter((o) => o.city === city);
    }
    if (status && status !== 'ALL') {
      results = results.filter((o) => o.orderStatus === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          o.deliveryAddress.toLowerCase().includes(q) ||
          o.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    }

    return paginateItems(results, page, pageSize);
  },

  bulkUpdateStatus: async (ids: string[], newStatus: OrderStatus): Promise<number> => {
    await delay(140);
    let count = 0;
    mockOrders.forEach((o) => {
      if (ids.includes(o.id)) {
        o.orderStatus = newStatus;
        o.timeline.push({
          status: newStatus,
          timestamp: 'Just now',
          description: `Bulk status update to ${newStatus} by Super Admin`,
          actor: 'Super Admin',
        });
        count++;
      }
    });
    return count;
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
  getAll: async (): Promise<NotificationItem[]> => {
    await delay(50);
    return [...mockNotifications];
  },

  markAsRead: async (id: string): Promise<void> => {
    await delay(40);
    const item = mockNotifications.find((n) => n.id === id);
    if (item) item.isRead = true;
  },

  markAllAsRead: async (): Promise<void> => {
    await delay(60);
    mockNotifications.forEach((n) => (n.isRead = true));
  },

  getPaginated: async (options: QueryOptions = {}): Promise<PaginatedResponse<NotificationItem>> => {
    await delay(60);
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, search, status } = options;
    let results = [...mockNotifications];

    if (status === 'UNREAD') {
      results = results.filter((n) => !n.isRead);
    } else if (status === 'READ') {
      results = results.filter((n) => n.isRead);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }

    return paginateItems(results, page, pageSize);
  },

  bulkMarkAsRead: async (ids: string[]): Promise<number> => {
    await delay(70);
    let count = 0;
    mockNotifications.forEach((n) => {
      if (ids.includes(n.id)) {
        n.isRead = true;
        count++;
      }
    });
    return count;
  },
};

export const securityApi = {
  getAdminUsers: async (): Promise<AdminUser[]> => {
    await delay(60);
    return [...mockAdminUsers];
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    await delay(80);
    return [...mockAuditLogs];
  },

  getActiveSessions: async (): Promise<ActiveSession[]> => {
    await delay(60);
    return [...mockActiveSessions];
  },

  revokeSession: async (id: string): Promise<ActiveSession> => {
    await delay(80);
    const session = mockActiveSessions.find((s) => s.id === id);
    if (session) {
      session.status = 'REVOKED';
      return { ...session };
    }
    throw new Error('Session not found');
  },

  getSecurityAlerts: async (): Promise<SecurityAlert[]> => {
    await delay(60);
    return [...mockSecurityAlerts];
  },

  resolveAlert: async (id: string, adminName: string = 'Eden Tilahun'): Promise<SecurityAlert> => {
    await delay(80);
    const alert = mockSecurityAlerts.find((a) => a.id === id);
    if (alert) {
      alert.resolved = true;
      alert.resolvedBy = adminName;
      return { ...alert };
    }
    throw new Error('Alert not found');
  },

  getIpRules: async (): Promise<IpBlockRule[]> => {
    await delay(50);
    return [...mockIpBlockRules];
  },

  addIpRule: async (rule: Omit<IpBlockRule, 'id'>): Promise<IpBlockRule> => {
    await delay(80);
    const newRule: IpBlockRule = {
      ...rule,
      id: `IPR-${String(mockIpBlockRules.length + 1).padStart(3, '0')}`,
    };
    mockIpBlockRules.unshift(newRule);
    return newRule;
  },

  deleteIpRule: async (id: string): Promise<void> => {
    await delay(60);
    const idx = mockIpBlockRules.findIndex((r) => r.id === id);
    if (idx !== -1) {
      mockIpBlockRules.splice(idx, 1);
    }
  },

  getFailedLogins: async (): Promise<FailedLoginLog[]> => {
    await delay(60);
    return [...mockFailedLogins];
  },

  getSuperAdminAccounts: async (): Promise<AdminUser[]> => {
    await delay(60);
    return mockAdminUsers.filter((u) => u.role === 'SUPER_ADMIN');
  },

  createSuperAdminAccount: async (data: {
    name: string;
    email: string;
    phone?: string;
    assignedCities: string[];
    initialPassword?: string;
  }): Promise<AdminUser> => {
    await delay(120);
    const newAdmin: AdminUser = {
      id: `ADM-${String(mockAdminUsers.length + 1).padStart(3, '0')}`,
      name: data.name,
      email: data.email,
      phone: data.phone || '+251 91 000 0000',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      lastLogin: 'Never (Newly Created)',
      assignedCities: data.assignedCities.length > 0 ? data.assignedCities : ['All Cities'],
      createdAt: new Date().toISOString().split('T')[0],
    };
    mockAdminUsers.unshift(newAdmin);

    mockAuditLogs.unshift({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      adminName: 'Eden Tilahun (Sub Admin)',
      adminEmail: 'subadmin@ardabmarket.com',
      action: 'CREATE_SUPER_ADMIN_ACCOUNT',
      entity: 'SuperAdminUser',
      entityId: newAdmin.id,
      ipAddress: '197.156.98.12 (Internal Sub Admin)',
      timestamp: 'Just now',
      changesSummary: `Super Admin account created for ${newAdmin.name} (${newAdmin.email}) with cities: ${newAdmin.assignedCities.join(', ')}`,
      status: 'SUCCESS',
    });

    return newAdmin;
  },

  toggleSuperAdminStatus: async (id: string): Promise<AdminUser> => {
    await delay(90);
    const user = mockAdminUsers.find((u) => u.id === id);
    if (user) {
      user.status = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      mockAuditLogs.unshift({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        adminName: 'Eden Tilahun (Sub Admin)',
        adminEmail: 'subadmin@ardabmarket.com',
        action: user.status === 'ACTIVE' ? 'REACTIVATE_SUPER_ADMIN' : 'SUSPEND_SUPER_ADMIN',
        entity: 'SuperAdminUser',
        entityId: user.id,
        ipAddress: '197.156.98.12',
        timestamp: 'Just now',
        changesSummary: `Account status updated to ${user.status} for Super Admin ${user.name}`,
        status: user.status === 'ACTIVE' ? 'SUCCESS' : 'WARNING',
      });
      return { ...user };
    }
    throw new Error('Super Admin user not found');
  },

  resetSuperAdminPassword: async (id: string): Promise<{ success: boolean; tempPassword: string }> => {
    await delay(100);
    const user = mockAdminUsers.find((u) => u.id === id);
    if (user) {
      const tempPassword = `Ardab@${Math.floor(1000 + Math.random() * 9000)}`;
      mockAuditLogs.unshift({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        adminName: 'Eden Tilahun (Sub Admin)',
        adminEmail: 'subadmin@ardabmarket.com',
        action: 'RESET_SUPER_ADMIN_PASSWORD',
        entity: 'SuperAdminUser',
        entityId: user.id,
        ipAddress: '197.156.98.12',
        timestamp: 'Just now',
        changesSummary: `Temporary security credential generated and dispatched for ${user.email}`,
        status: 'SUCCESS',
      });
      return { success: true, tempPassword };
    }
    throw new Error('Super Admin user not found');
  },

  updateSuperAdminAccount: async (id: string, data: Partial<AdminUser>): Promise<AdminUser> => {
    await delay(100);
    const user = mockAdminUsers.find((u) => u.id === id);
    if (user) {
      if (data.name) user.name = data.name;
      if (data.email) user.email = data.email;
      if (data.phone) user.phone = data.phone;
      if (data.assignedCities) user.assignedCities = data.assignedCities;
      if (data.status) user.status = data.status;

      mockAuditLogs.unshift({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        adminName: 'Eden Tilahun (Sub Admin)',
        adminEmail: 'subadmin@ardabmarket.com',
        action: 'UPDATE_SUPER_ADMIN_ACCOUNT',
        entity: 'SuperAdminUser',
        entityId: user.id,
        ipAddress: '197.156.98.12',
        timestamp: 'Just now',
        changesSummary: `Super Admin account details updated for ${user.name} (${user.email})`,
        status: 'SUCCESS',
      });
      return { ...user };
    }
    throw new Error('Super Admin user not found');
  },

  deleteSuperAdminAccount: async (id: string): Promise<boolean> => {
    await delay(100);
    const idx = mockAdminUsers.findIndex((u) => u.id === id);
    if (idx !== -1) {
      const removed = mockAdminUsers.splice(idx, 1)[0];
      mockAuditLogs.unshift({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        adminName: 'Eden Tilahun (Sub Admin)',
        adminEmail: 'subadmin@ardabmarket.com',
        action: 'DELETE_SUPER_ADMIN_ACCOUNT',
        entity: 'SuperAdminUser',
        entityId: id,
        ipAddress: '197.156.98.12',
        timestamp: 'Just now',
        changesSummary: `Super Admin account deleted for ${removed.name} (${removed.email})`,
        status: 'WARNING',
      });
      return true;
    }
    return false;
  },
};

// ==========================================
// 8. Sub Admin Services (Support, Maintenance, Feedback)
// ==========================================
export const supportApi = {
  getAll: async (filterCity?: string, status?: string): Promise<SupportTicket[]> => {
    await delay(80);
    let results = [...mockSupportTickets];
    if (filterCity && filterCity !== 'All Cities') {
      results = results.filter((t) => t.city === filterCity);
    }
    if (status && status !== 'ALL') {
      results = results.filter((t) => t.status === status);
    }
    return results;
  },

  getById: async (id: string): Promise<SupportTicket | undefined> => {
    await delay(50);
    return mockSupportTickets.find((t) => t.id === id);
  },

  updateStatus: async (id: string, status: TicketStatus, notes?: string): Promise<SupportTicket> => {
    await delay(80);
    const ticket = mockSupportTickets.find((t) => t.id === id);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
      if (notes) ticket.resolutionNotes = notes;
      return { ...ticket };
    }
    throw new Error('Ticket not found');
  },

  addMessage: async (ticketId: string, message: string, senderName: string = 'Eden Tilahun'): Promise<SupportTicket> => {
    await delay(80);
    const ticket = mockSupportTickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.messages.push({
        id: `MSG-${String(ticket.messages.length + 1).padStart(2, '0')}`,
        senderName,
        senderType: 'SUB_ADMIN',
        message,
        timestamp: 'Just now',
      });
      ticket.updatedAt = new Date().toISOString();
      return { ...ticket };
    }
    throw new Error('Ticket not found');
  },
};

export const maintenanceApi = {
  getServices: async (): Promise<SystemService[]> => {
    await delay(60);
    return [...mockSystemServices];
  },

  getMaintenanceWindows: async (): Promise<MaintenanceWindow[]> => {
    await delay(60);
    return [...mockMaintenanceWindows];
  },

  createWindow: async (window: Omit<MaintenanceWindow, 'id'>): Promise<MaintenanceWindow> => {
    await delay(100);
    const newWindow: MaintenanceWindow = {
      ...window,
      id: `MW-${String(mockMaintenanceWindows.length + 201)}`,
    };
    mockMaintenanceWindows.unshift(newWindow);
    return newWindow;
  },

  updateWindowStatus: async (id: string, status: MaintenanceWindow['status']): Promise<MaintenanceWindow> => {
    await delay(80);
    const win = mockMaintenanceWindows.find((w) => w.id === id);
    if (win) {
      win.status = status;
      return { ...win };
    }
    throw new Error('Maintenance window not found');
  },

  getTasks: async (): Promise<MaintenanceTask[]> => {
    await delay(50);
    return [...mockMaintenanceTasks];
  },

  runTask: async (id: string): Promise<MaintenanceTask> => {
    await delay(150);
    const task = mockMaintenanceTasks.find((t) => t.id === id);
    if (task) {
      task.lastRun = 'Just now';
      task.status = 'SUCCESS';
      return { ...task };
    }
    throw new Error('Task not found');
  },

  getEquipmentLogs: async (city?: string): Promise<EquipmentServiceLog[]> => {
    await delay(70);
    if (city && city !== 'All Cities') {
      return mockEquipmentLogs.filter((l) => l.city === city);
    }
    return [...mockEquipmentLogs];
  },
};

export const feedbackApi = {
  getAll: async (type?: string, city?: string): Promise<FeedbackItem[]> => {
    await delay(80);
    let results = [...mockFeedbackItems];
    if (type && type !== 'ALL') {
      results = results.filter((f) => f.type === type);
    }
    if (city && city !== 'All Cities') {
      results = results.filter((f) => f.city === city);
    }
    return results;
  },

  getMetrics: async (): Promise<FeedbackMetrics> => {
    await delay(50);
    return { ...mockFeedbackMetrics };
  },

  updateStatus: async (id: string, status: FeedbackStatus): Promise<FeedbackItem> => {
    await delay(70);
    const item = mockFeedbackItems.find((f) => f.id === id);
    if (item) {
      item.status = status;
      return { ...item };
    }
    throw new Error('Feedback item not found');
  },

  replyToFeedback: async (id: string, reply: string): Promise<FeedbackItem> => {
    await delay(90);
    const item = mockFeedbackItems.find((f) => f.id === id);
    if (item) {
      item.adminReply = reply;
      item.repliedAt = 'Just now';
      item.status = 'REVIEWED';
      return { ...item };
    }
    throw new Error('Feedback item not found');
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
