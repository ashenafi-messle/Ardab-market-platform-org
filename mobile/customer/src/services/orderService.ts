// ==============================================================================
// Ardab Market - Mobile Customer Order API Client & Offline Cache
// ==============================================================================

import { apiFetch } from '@/constants/api';
import { secureStorage } from '@/services/secureStorage';
import {
  CustomerOrder,
  OrderPagination,
  OrderMilestone,
  OrderTimelineEvent,
  OrderDeliveryInfo,
  OrderDeliverySnapshot,
  OrderSupportContext,
} from '@/types';
import { Linking, Platform } from 'react-native';

const STORAGE_KEYS = {
  ORDERS_CACHE_PREFIX: 'ardab_cached_orders_',
  ORDER_DETAIL_PREFIX: 'ardab_cached_detail_',
  TRACKING_PREFIX: 'ardab_cached_tracking_',
  LAST_FETCH_PREFIX: 'ardab_last_fetch_',
};

export interface OrdersListResult {
  orders: CustomerOrder[];
  pagination: OrderPagination;
  isOffline?: boolean;
  lastUpdated?: string | null;
}

export interface OrderDetailsResult {
  order: CustomerOrder;
  isOffline?: boolean;
  lastUpdated?: string | null;
}

export interface OrderTrackingResult {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  isCancellable: boolean;
  milestones: OrderMilestone[];
  timeline: OrderTimelineEvent[];
  delivery: OrderDeliveryInfo | null;
  deliveryAddress: OrderDeliverySnapshot | null;
  support: OrderSupportContext;
  isOffline?: boolean;
  lastUpdated?: string | null;
}

export const orderService = {
  /**
   * Fetch authenticated customer's orders with pagination & status filtering.
   * Leverages secure local caching for instant render and offline resilience.
   */
  async getMyOrders(params: {
    page?: number;
    limit?: number;
    status?: 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  } = {}): Promise<OrdersListResult> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const status = params.status || 'ALL';

    const cacheKey = `${STORAGE_KEYS.ORDERS_CACHE_PREFIX}${status}_p${page}`;
    const timestampKey = `${STORAGE_KEYS.LAST_FETCH_PREFIX}${status}_p${page}`;

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (status !== 'ALL') {
        queryParams.append('status', status);
      }

      const res = await apiFetch<{
        success: boolean;
        data: CustomerOrder[];
        pagination: OrderPagination;
        message?: string;
      }>(`/customer/orders?${queryParams.toString()}`, {
        method: 'GET',
      });

      if (res.ok && res.data) {
        const orders = Array.isArray(res.data.data) ? res.data.data : [];
        const pagination = res.data.pagination || {
          page,
          limit,
          pageSize: orders.length,
          total: orders.length,
          totalPages: 1,
        };

        const now = new Date().toISOString();
        // Asynchronously persist to cache
        secureStorage.setItem(cacheKey, JSON.stringify({ orders, pagination })).catch(() => {});
        secureStorage.setItem(timestampKey, now).catch(() => {});

        return {
          orders,
          pagination,
          isOffline: false,
          lastUpdated: now,
        };
      }

      throw new Error(res.data?.message || 'Failed to fetch orders');
    } catch (err: any) {
      // Offline fallback: Attempt to load from cached storage
      const [cachedRaw, lastUpdated] = await Promise.all([
        secureStorage.getItem(cacheKey),
        secureStorage.getItem(timestampKey),
      ]);

      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw);
          return {
            orders: parsed.orders || [],
            pagination: parsed.pagination || {
              page,
              limit,
              pageSize: parsed.orders?.length || 0,
              total: parsed.orders?.length || 0,
              totalPages: 1,
            },
            isOffline: true,
            lastUpdated: lastUpdated || null,
          };
        } catch {
          // ignore cache parse error
        }
      }

      // If network failed and no cache exists, rethrow with friendly message
      if (err.message && err.message.includes('Customer authentication required')) {
        throw err;
      }

      return {
        orders: [],
        pagination: { page, limit, pageSize: 0, total: 0, totalPages: 1 },
        isOffline: true,
        lastUpdated: null,
      };
    }
  },

  /**
   * Fetch single order details by ID (IDOR protected - only returns customer's own order)
   */
  async getOrderById(orderId: string): Promise<OrderDetailsResult> {
    const cacheKey = `${STORAGE_KEYS.ORDER_DETAIL_PREFIX}${orderId}`;
    const timestampKey = `${STORAGE_KEYS.LAST_FETCH_PREFIX}detail_${orderId}`;

    // Handle legacy local/mock orders gracefully without failing
    if (orderId.startsWith('ord-')) {
      const savedOrdersRaw = await secureStorage.getItem('ardab_saved_orders');
      if (savedOrdersRaw) {
        try {
          const list = JSON.parse(savedOrdersRaw);
          const found = Array.isArray(list)
            ? list.find((o: any) => o.id === orderId || o.orderNumber === orderId)
            : null;
          if (found) {
            return {
              order: found,
              isOffline: true,
              lastUpdated: found.createdAt || null,
            };
          }
        } catch {
          // ignore
        }
      }
    }

    try {
      const res = await apiFetch<{
        success: boolean;
        data: CustomerOrder;
        message?: string;
      }>(`/customer/orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
      });

      if (res.ok && res.data?.data) {
        const order = res.data.data;
        const now = new Date().toISOString();
        secureStorage.setItem(cacheKey, JSON.stringify(order)).catch(() => {});
        secureStorage.setItem(timestampKey, now).catch(() => {});

        return {
          order,
          isOffline: false,
          lastUpdated: now,
        };
      }

      throw new Error(res.data?.message || 'Order not found');
    } catch (err: any) {
      // Offline fallback: 1. check detail cache, 2. check saved orders list
      const [cachedRaw, lastUpdated, savedOrdersRaw] = await Promise.all([
        secureStorage.getItem(cacheKey),
        secureStorage.getItem(timestampKey),
        secureStorage.getItem('ardab_saved_orders'),
      ]);

      if (cachedRaw) {
        try {
          const order = JSON.parse(cachedRaw);
          return {
            order,
            isOffline: true,
            lastUpdated: lastUpdated || null,
          };
        } catch {
          // ignore
        }
      }

      if (savedOrdersRaw) {
        try {
          const list = JSON.parse(savedOrdersRaw);
          const found = Array.isArray(list)
            ? list.find((o: any) => o.id === orderId || o.orderNumber === orderId)
            : null;
          if (found) {
            return {
              order: found,
              isOffline: true,
              lastUpdated: found.createdAt || null,
            };
          }
        } catch {
          // ignore
        }
      }

      throw err;
    }
  },

  /**
   * Fetch full order tracking milestones, progress, and chronological events
   */
  async getOrderTimeline(orderId: string): Promise<OrderTrackingResult> {
    const cacheKey = `${STORAGE_KEYS.TRACKING_PREFIX}${orderId}`;
    const timestampKey = `${STORAGE_KEYS.LAST_FETCH_PREFIX}track_${orderId}`;

    // Handle legacy local/mock orders gracefully
    if (orderId.startsWith('ord-')) {
      const savedOrdersRaw = await secureStorage.getItem('ardab_saved_orders');
      if (savedOrdersRaw) {
        try {
          const list = JSON.parse(savedOrdersRaw);
          const found = Array.isArray(list)
            ? list.find((o: any) => o.id === orderId || o.orderNumber === orderId)
            : null;
          if (found) {
            return {
              orderId: found.id,
              orderNumber: found.orderNumber,
              status: found.status,
              paymentStatus: found.paymentStatus,
              isCancellable: false,
              milestones: found.milestones || [],
              timeline: found.timeline || [],
              delivery: found.delivery || null,
              deliveryAddress: found.deliveryAddressSnapshot || null,
              support: {
                telegramBotUrl: 'https://t.me/Ardab_market_bot',
                supportPhone: '+251911000000',
                supportEmail: 'support@ardabmarket.com',
                orderReference: found.orderNumber,
              },
              isOffline: true,
              lastUpdated: found.createdAt || null,
            };
          }
        } catch {
          // ignore
        }
      }
    }

    try {
      const res = await apiFetch<{
        success: boolean;
        data: OrderTrackingResult;
        message?: string;
      }>(`/customer/orders/${encodeURIComponent(orderId)}/tracking`, {
        method: 'GET',
      });

      if (res.ok && res.data?.data) {
        const data = res.data.data;
        const now = new Date().toISOString();
        secureStorage.setItem(cacheKey, JSON.stringify(data)).catch(() => {});
        secureStorage.setItem(timestampKey, now).catch(() => {});

        return {
          ...data,
          isOffline: false,
          lastUpdated: now,
        };
      }

      throw new Error(res.data?.message || 'Tracking information not available');
    } catch (err: any) {
      // Offline fallback
      const [cachedRaw, lastUpdated] = await Promise.all([
        secureStorage.getItem(cacheKey),
        secureStorage.getItem(timestampKey),
      ]);

      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          return {
            ...cached,
            isOffline: true,
            lastUpdated: lastUpdated || null,
          };
        } catch {
          // ignore
        }
      }

      throw err;
    }
  },

  /**
   * Place a new order via the customer checkout endpoint
   */
  async checkoutOrder(payload: {
    items: { productId: string; quantity: number }[];
    deliveryAddress: {
      recipientName: string;
      phone: string;
      city: string;
      deliveryZone?: string;
      neighborhood?: string;
      addressLine: string;
    };
    paymentMethod?: 'CASH_ON_DELIVERY' | 'ONLINE' | string;
    customerNote?: string;
    idempotencyKey?: string;
    returnUrl?: string;
  }): Promise<CustomerOrder & {
    paymentRequired?: boolean;
    payment?: {
      paymentId: string;
      txRef?: string;
      checkoutUrl?: string;
      status: string;
    } | null;
  }> {
    const res = await apiFetch<{
      success: boolean;
      data: CustomerOrder & {
        paymentRequired?: boolean;
        payment?: {
          paymentId: string;
          txRef?: string;
          checkoutUrl?: string;
          status: string;
        } | null;
      };
      message?: string;
    }>('/customer/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.ok && res.data?.data) {
      return res.data.data;
    }

    throw new Error(res.data?.message || 'Failed to place order');
  },

  /**
   * Cancel an order in PENDING, CONFIRMED, or PROCESSING state
   */
  async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const cancelReason = reason || 'Customer requested cancellation from mobile app';

    // 1. Handle local/offline mock orders (id starting with ord-)
    if (orderId.startsWith('ord-')) {
      const savedOrdersRaw = await secureStorage.getItem('ardab_saved_orders');
      if (savedOrdersRaw) {
        try {
          const list = JSON.parse(savedOrdersRaw);
          if (Array.isArray(list)) {
            const idx = list.findIndex((o: any) => o.id === orderId || o.orderNumber === orderId);
            if (idx !== -1) {
              list[idx].status = 'CANCELLED';
              list[idx].canCancel = false;
              list[idx].cancelledReason = cancelReason;
              list[idx].cancelledAt = new Date().toISOString();
              await secureStorage.setItem('ardab_saved_orders', JSON.stringify(list));
              return {
                success: true,
                message: 'Order cancelled successfully',
              };
            }
          }
        } catch {
          // ignore
        }
      }
      return {
        success: true,
        message: 'Order cancelled successfully',
      };
    }

    // 2. Call authoritative backend cancellation endpoint
    try {
      const res = await apiFetch<{
        success: boolean;
        message: string;
        data?: any;
      }>(`/customer/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (res.ok && (res.data?.success || res.status === 200)) {
        // Sync local cache: update order detail cache to CANCELLED
        const detailCacheKey = `${STORAGE_KEYS.ORDER_DETAIL_PREFIX}${orderId}`;
        try {
          const cached = await secureStorage.getItem(detailCacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.status = 'CANCELLED';
            parsed.canCancel = false;
            parsed.cancelledReason = cancelReason;
            parsed.cancelledAt = new Date().toISOString();
            await secureStorage.setItem(detailCacheKey, JSON.stringify(parsed));
          }
        } catch {
          secureStorage.deleteItem(detailCacheKey).catch(() => {});
        }

        // Invalidate tracking cache
        secureStorage.deleteItem(`${STORAGE_KEYS.TRACKING_PREFIX}${orderId}`).catch(() => {});

        // Sync ardab_saved_orders if stored
        try {
          const savedRaw = await secureStorage.getItem('ardab_saved_orders');
          if (savedRaw) {
            const list = JSON.parse(savedRaw);
            if (Array.isArray(list)) {
              const item = list.find((o: any) => o.id === orderId || o.orderNumber === orderId);
              if (item) {
                item.status = 'CANCELLED';
                item.canCancel = false;
                await secureStorage.setItem('ardab_saved_orders', JSON.stringify(list));
              }
            }
          }
        } catch {
          // ignore
        }

        return {
          success: true,
          message: res.data?.message || 'Order cancelled successfully',
        };
      }

      throw new Error(res.data?.message || 'Unable to cancel order at this stage');
    } catch (err: any) {
      // If network fails but order is in local saved orders, cancel offline copy gracefully
      const savedOrdersRaw = await secureStorage.getItem('ardab_saved_orders');
      if (savedOrdersRaw) {
        try {
          const list = JSON.parse(savedOrdersRaw);
          if (Array.isArray(list)) {
            const idx = list.findIndex((o: any) => o.id === orderId || o.orderNumber === orderId);
            if (idx !== -1) {
              list[idx].status = 'CANCELLED';
              list[idx].canCancel = false;
              list[idx].cancelledReason = cancelReason;
              list[idx].cancelledAt = new Date().toISOString();
              await secureStorage.setItem('ardab_saved_orders', JSON.stringify(list));
              return {
                success: true,
                message: 'Order cancelled locally while offline',
              };
            }
          }
        } catch {
          // ignore
        }
      }

      throw err;
    }
  },

  /**
   * Open Ardab Market Customer Support with order reference
   * Reuses the official Telegram bot (@Ardab_market_bot) and customer support hotline
   */
  async contactSupport(orderNumber?: string): Promise<void> {
    const sanitizedOrder = orderNumber ? orderNumber.replace(/[^a-zA-Z0-9_-]/g, '') : '';
    const telegramUrl = sanitizedOrder
      ? `https://t.me/Ardab_market_bot?start=order_${sanitizedOrder}`
      : 'https://t.me/Ardab_market_bot';

    try {
      const supported = await Linking.canOpenURL(telegramUrl);
      if (supported) {
        await Linking.openURL(telegramUrl);
        return;
      }
    } catch {
      // Fallback below
    }

    // Fallback: Open phone dialer
    try {
      await Linking.openURL('tel:+251911000000');
    } catch {
      // Non-critical
    }
  },
};
