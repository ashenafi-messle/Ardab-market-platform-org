/**
 * Ardab Market Agent - Production API Client & Service Abstraction
 *
 * Connects the React Native / Expo Agent Mobile Application directly to
 * the Ardab Market central backend endpoints (/api/agent/*).
 */

import {
  AgentProfile,
  AgentDashboard,
  AgentCustomer,
  AgentOrder,
  AgentNotification,
  AgentCommissionTransaction,
  OrderStatus,
  CommissionStatus,
  OrderItem,
} from '../types/agent';
import { agentFetch } from '../constants/api';

// -----------------------------------------------------------------------------
// Mapping Helpers (Backend Schema -> Mobile UI Schema)
// -----------------------------------------------------------------------------

function mapAgentProfile(data: any): AgentProfile {
  if (!data) {
    throw new Error('Invalid agent profile data received.');
  }
  const name = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Ardab Agent';
  const nameParts = name.split(' ');
  return {
    id: data.id,
    name,
    firstName: data.firstName || nameParts[0] || 'Agent',
    lastName: data.lastName || nameParts.slice(1).join(' ') || '',
    email: data.email,
    phone: data.phone || '',
    agentReference: data.agentCode || data.agentReference || `AG-${(data.id || '').substring(0, 8).toUpperCase()}`,
    accountStatus: data.status === 'ACTIVE' ? 'ACTIVE' : data.status === 'SUSPENDED' ? 'SUSPENDED' : 'PENDING_ACTIVATION',
    commissionRate: Number(data.commissionRate ?? 5),
    city: data.city || 'Addis Ababa',
    registeredAt: data.createdAt || data.registeredAt || new Date().toISOString(),
  };
}

function mapAgentDashboard(data: any): AgentDashboard {
  const fin = data?.financialSummary || {};
  const cust = data?.customerSummary || {};
  const ord = data?.orderSummary || {};

  return {
    totalBalance: Number(fin.approvedCommission ?? data?.totalBalance ?? 0),
    totalEarned: Number(fin.totalEarned ?? data?.totalEarned ?? 0),
    pendingCommission: Number(fin.pendingCommission ?? data?.pendingCommission ?? 0),
    approvedCommission: Number(fin.approvedCommission ?? data?.approvedCommission ?? 0),
    paidCommission: Number(fin.paidCommission ?? data?.paidCommission ?? 0),
    totalCustomers: Number(cust.totalCustomers ?? data?.totalCustomers ?? 0),
    activeCustomers: Number(cust.activeCustomers ?? data?.activeCustomers ?? 0),
    totalOrders: Number(ord.totalOrders ?? data?.totalOrders ?? 0),
    acceptedOrders: Number(ord.acceptedOrders ?? data?.acceptedOrders ?? 0),
    pendingOrders: Number(ord.pendingOrders ?? data?.pendingOrders ?? 0),
    completedOrders: Number(ord.completedOrders ?? data?.completedOrders ?? 0),
    assignedCommissionRate: Number(data?.agent?.commissionRate ?? data?.assignedCommissionRate ?? 5),
  };
}

function mapAgentCustomer(c: any): AgentCustomer {
  return {
    id: c.id,
    name: c.fullName || c.name || 'Customer',
    email: c.email || '',
    phone: c.phone || '',
    avatarUrl: c.profileImageUrl || c.avatarUrl,
    integratedAt: c.integrationDate || c.integratedAt || c.createdAt || new Date().toISOString(),
    integrationStatus: c.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
    attributedOrdersCount: Number(c.orderCount ?? c.attributedOrdersCount ?? 0),
    totalOrderValue: Number(c.totalOrderValue ?? 0),
    generatedCommission: Number(c.generatedCommission ?? 0),
  };
}

function mapAgentOrder(o: any): AgentOrder {
  const rawStatus = (o.status || o.orderStatus || 'PENDING').toUpperCase();
  let orderStatus: OrderStatus = 'PENDING';
  if (['CONFIRMED', 'ACCEPTED'].includes(rawStatus)) orderStatus = 'ACCEPTED';
  else if (['PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(rawStatus)) orderStatus = 'PROCESSING';
  else if (['DELIVERED', 'COMPLETED'].includes(rawStatus)) orderStatus = 'COMPLETED';
  else if (['CANCELLED', 'REJECTED', 'FAILED'].includes(rawStatus)) orderStatus = 'CANCELLED';

  const commStatusRaw = (o.commissionStatus || o.commission?.status || 'PENDING').toUpperCase();
  let commissionStatus: CommissionStatus = 'PENDING';
  if (commStatusRaw === 'PAYABLE' || commStatusRaw === 'APPROVED') commissionStatus = 'APPROVED';
  else if (commStatusRaw === 'PAID') commissionStatus = 'PAID';

  const items: OrderItem[] = Array.isArray(o.items)
    ? o.items.map((i: any) => ({
        id: i.id || '',
        name: i.productName || i.name || 'Product Item',
        quantity: Number(i.quantity || 1),
        unitPrice: Number(i.unitPrice || 0),
        totalPrice: Number(i.totalPrice || (i.quantity || 1) * (i.unitPrice || 0)),
      }))
    : [];

  const orderTotal = Number(o.totalAmount || o.orderTotal || 0);
  const commissionRate = Number(o.commissionRate || o.commission?.rateSnapshot || 5);
  const commissionAmount = Number(o.commissionAmount || o.commission?.commissionAmount || 0);

  return {
    id: o.id,
    orderReference: o.orderNumber || o.orderReference || `ORD-${(o.id || '').substring(0, 8).toUpperCase()}`,
    customerId: o.customer?.id || o.customerId || '',
    customerName: o.customer?.fullName || o.customerName || 'Customer',
    customerPhone: o.customer?.phone || o.customerPhone,
    customerEmail: o.customer?.email || o.customerEmail,
    deliveryAddress:
      typeof o.deliveryAddress === 'string'
        ? o.deliveryAddress
        : o.deliveryAddress?.addressLine1 || o.city || 'Addis Ababa',
    orderDate: o.placedAt || o.orderDate || o.createdAt || new Date().toISOString(),
    orderTotal,
    commissionRate,
    commissionBasis: `Order Total (ETB ${orderTotal.toFixed(2)})`,
    commissionAmount,
    orderStatus,
    commissionStatus,
    itemsCount: o.itemCount ?? items.length,
    items,
    paymentMethod: o.paymentMethod || 'Cash on Delivery',
  };
}

function mapAgentCommissionTransaction(tx: any): AgentCommissionTransaction {
  const rawStatus = (tx.status || 'PENDING').toUpperCase();
  let status: CommissionStatus = 'PENDING';
  if (rawStatus === 'PAYABLE' || rawStatus === 'APPROVED') status = 'APPROVED';
  else if (rawStatus === 'PAID') status = 'PAID';

  return {
    id: tx.id,
    transactionReference: tx.transactionReference || `TX-${(tx.id || '').substring(0, 8).toUpperCase()}`,
    orderId: tx.orderId || tx.order?.id || '',
    orderReference: tx.order?.orderNumber || tx.orderReference || `ORD-${(tx.orderId || tx.id).substring(0, 8).toUpperCase()}`,
    customerName: tx.order?.customer?.fullName || tx.customerName || 'Customer',
    commissionRate: Number(tx.rateSnapshot || tx.commissionRate || 5),
    commissionBasis: Number(tx.order?.totalAmount || tx.orderAmount || 0),
    commissionAmount: Number(tx.commissionAmount || 0),
    transactionDate: tx.calculatedAt || tx.createdAt || new Date().toISOString(),
    status,
  };
}

function mapAgentNotification(n: any): AgentNotification {
  let type: any = 'SYSTEM';
  const rawType = (n.type || '').toUpperCase();
  if (rawType.includes('ACCEPTED') || rawType.includes('ORDER')) type = 'ACCEPTED_ORDER';
  else if (rawType.includes('PAID')) type = 'COMMISSION_PAID';
  else if (rawType.includes('CREDITED')) type = 'COMMISSION_CREDITED';
  else if (rawType.includes('APPROVED')) type = 'COMMISSION_APPROVED';

  return {
    id: n.id,
    title: n.title || 'Notification',
    message: n.message || '',
    type,
    relatedOrderId: n.data?.orderId || n.relatedOrderId,
    orderReference: n.data?.orderNumber || n.orderReference,
    customerName: n.data?.customerName || n.customerName,
    orderValue: n.data?.totalAmount ? Number(n.data.totalAmount) : n.orderValue,
    commissionAmount: n.data?.commissionAmount ? Number(n.data.commissionAmount) : n.commissionAmount,
    isRead: Boolean(n.isRead),
    createdAt: n.createdAt || new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Agent API Service Object
// -----------------------------------------------------------------------------

export const agentApi = {
  // --------------------------------------------------------------------------
  // Authentication & First-Time Activation
  // --------------------------------------------------------------------------

  /**
   * Request activation OTP for pre-registered agent email
   */
  async requestActivationOtp(email: string): Promise<{ success: boolean; message: string; maskedEmail: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await agentFetch<{ message: string; maskedEmail: string }>(
      '/auth/request-activation-otp',
      {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
        skipAuth: true,
      }
    );

    return {
      success: true,
      message: res.message || 'Verification code sent to your registered email address.',
      maskedEmail: res.maskedEmail || cleanEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    };
  },

  /**
   * Verify 6-digit OTP code to receive a short-lived activation authorization token
   */
  async verifyActivationOtp(email: string, otp: string): Promise<{ success: boolean; activationToken: string }> {
    const res = await agentFetch<{ message: string; activationToken: string }>(
      '/auth/verify-activation-otp',
      {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
        skipAuth: true,
      }
    );

    return {
      success: true,
      activationToken: res.activationToken,
    };
  },

  /**
   * Complete account activation by setting password
   */
  async setInitialPassword(
    activationToken: string,
    password: string
  ): Promise<{ success: boolean; profile: AgentProfile; token: string; refreshToken?: string }> {
    const res = await agentFetch<{ message: string; agent: any; tokens: { accessToken: string; refreshToken: string } }>(
      '/auth/set-password',
      {
        method: 'POST',
        body: JSON.stringify({ activationToken, password }),
        skipAuth: true,
      }
    );

    return {
      success: true,
      profile: mapAgentProfile(res.agent),
      token: res.tokens.accessToken,
      refreshToken: res.tokens.refreshToken,
    };
  },

  /**
   * Existing Agent Login
   */
  async login(
    email: string,
    password: string
  ): Promise<{ profile: AgentProfile; token: string; refreshToken?: string }> {
    const res = await agentFetch<{ agent: any; tokens: { accessToken: string; refreshToken: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        skipAuth: true,
      }
    );

    return {
      profile: mapAgentProfile(res.agent),
      token: res.tokens.accessToken,
      refreshToken: res.tokens.refreshToken,
    };
  },

  /**
   * Logout and invalidate session
   */
  async logout(refreshToken?: string): Promise<{ success: boolean }> {
    try {
      await agentFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore network errors during logout
    }
    return { success: true };
  },

  /**
   * Forgot password OTP request
   */
  async requestPasswordResetOtp(email: string): Promise<{ success: boolean; message: string }> {
    const res = await agentFetch<{ message: string }>(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        skipAuth: true,
      }
    );

    return {
      success: true,
      message: res.message || 'Password reset code has been sent to your registered email.',
    };
  },

  /**
   * Verify password reset OTP
   */
  async verifyPasswordResetOtp(email: string, otp: string): Promise<{ success: boolean; resetToken: string }> {
    const res = await agentFetch<{ message: string; resetToken: string }>(
      '/auth/verify-reset-otp',
      {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
        skipAuth: true,
      }
    );

    return {
      success: true,
      resetToken: res.resetToken,
    };
  },

  /**
   * Reset password with resetToken OR directly with email + otp + newPassword
   */
  async resetPassword(
    emailOrResetToken: string,
    otpOrPassword: string,
    newPassword?: string
  ): Promise<{ success: boolean }> {
    if (newPassword !== undefined) {
      const verifyRes = await agentFetch<{ resetToken: string }>('/auth/verify-reset-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: emailOrResetToken.trim().toLowerCase(),
          otp: otpOrPassword.trim(),
        }),
        skipAuth: true,
      });

      await agentFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          resetToken: verifyRes.resetToken,
          password: newPassword,
        }),
        skipAuth: true,
      });
    } else {
      await agentFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          resetToken: emailOrResetToken,
          password: otpOrPassword,
        }),
        skipAuth: true,
      });
    }

    return { success: true };
  },

  // --------------------------------------------------------------------------
  // Dashboard & Profile
  // --------------------------------------------------------------------------

  async getDashboardOverview(): Promise<AgentDashboard> {
    const res = await agentFetch<any>('/dashboard');
    return mapAgentDashboard(res);
  },

  async getProfile(): Promise<AgentProfile> {
    const res = await agentFetch<any>('/profile');
    return mapAgentProfile(res.agent);
  },

  async updateProfile(data: { name?: string; phone?: string }): Promise<AgentProfile> {
    const res = await agentFetch<any>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return mapAgentProfile(res.agent);
  },

  // --------------------------------------------------------------------------
  // Attributed Orders
  // --------------------------------------------------------------------------

  async getOrders(params?: { status?: string; search?: string }): Promise<AgentOrder[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') {
      query.append('status', params.status);
    }
    if (params?.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }

    const path = `/orders${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await agentFetch<{ orders: any[] }>(path);
    return (res.orders || []).map(mapAgentOrder);
  },

  async getOrderById(id: string): Promise<AgentOrder | null> {
    try {
      const res = await agentFetch<{ order: any }>(`/orders/${id}`);
      return res.order ? mapAgentOrder(res.order) : null;
    } catch (err: any) {
      if (err?.status === 404) return null;
      throw err;
    }
  },

  // --------------------------------------------------------------------------
  // Integrated Customers
  // --------------------------------------------------------------------------

  async getCustomers(params?: { search?: string }): Promise<AgentCustomer[]> {
    const query = new URLSearchParams();
    if (params?.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }

    const path = `/customers${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await agentFetch<{ customers: any[] }>(path);
    return (res.customers || []).map(mapAgentCustomer);
  },

  async getCustomerById(id: string): Promise<{
    customer: AgentCustomer;
    attributedOrders: AgentOrder[];
  } | null> {
    try {
      const [custRes, ordersRes] = await Promise.all([
        agentFetch<{ customer: any }>(`/customers/${id}`),
        agentFetch<{ orders: any[] }>(`/customers/${id}/orders`),
      ]);

      if (!custRes?.customer) return null;

      return {
        customer: mapAgentCustomer(custRes.customer),
        attributedOrders: (ordersRes.orders || []).map(mapAgentOrder),
      };
    } catch (err: any) {
      if (err?.status === 404) return null;
      throw err;
    }
  },

  // --------------------------------------------------------------------------
  // Notifications
  // --------------------------------------------------------------------------

  async getNotifications(): Promise<AgentNotification[]> {
    const res = await agentFetch<{ notifications: any[] }>('/notifications');
    return (res.notifications || []).map(mapAgentNotification);
  },

  async getUnreadCount(): Promise<number> {
    const res = await agentFetch<{ unreadCount: number }>('/notifications/unread-count');
    return res.unreadCount ?? 0;
  },

  async markNotificationAsRead(id: string): Promise<void> {
    await agentFetch(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsAsRead(): Promise<void> {
    await agentFetch('/notifications/read-all', {
      method: 'PATCH',
    });
  },

  // --------------------------------------------------------------------------
  // Commission History
  // --------------------------------------------------------------------------

  async getCommissionHistory(params?: { status?: string }): Promise<AgentCommissionTransaction[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') {
      // Map UI status filter to backend CommissionStatus enum (PENDING, PAYABLE, PAID)
      const mappedStatus = params.status === 'APPROVED' ? 'PAYABLE' : params.status;
      query.append('status', mappedStatus);
    }

    const path = `/commissions${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await agentFetch<{ commissions: any[] }>(path);
    return (res.commissions || []).map(mapAgentCommissionTransaction);
  },

  // --------------------------------------------------------------------------
  // Device & Push Notifications
  // --------------------------------------------------------------------------

  async registerDevice(expoPushToken: string, platform?: string, deviceId?: string): Promise<void> {
    await agentFetch('/devices/register', {
      method: 'POST',
      body: JSON.stringify({ expoPushToken, platform, deviceId }),
    });
  },

  async removeDevice(deviceId: string): Promise<void> {
    await agentFetch(`/devices/${deviceId}`, {
      method: 'DELETE',
    });
  },
};
