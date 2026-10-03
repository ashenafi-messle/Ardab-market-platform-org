// ==============================================================================
// Ardab Market - Mobile Payment Service (Chapa Gateway & Escrow)
// ==============================================================================
// Handles secure payment initialization, status verification polling, and transaction history.
// Secret keys are NEVER stored on or exposed to the mobile application.
// ==============================================================================

import { apiFetch } from '@/constants/api';

export interface InitializePaymentResponse {
  paymentId: string;
  txRef: string;
  checkoutUrl: string | null;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  amount: string;
  currency: string;
  message?: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
  amount: string;
  currency: string;
  paidAt: string | null;
  isSuccess: boolean;
  failureReason?: string | null;
}

export interface PaymentHistoryItem {
  id: string;
  orderId: string;
  orderNumber: string;
  txRef: string;
  amount: string;
  currency: string;
  status: string;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentHistoryResponse {
  items: PaymentHistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const paymentService = {
  /**
   * Initializes a secure Chapa payment session for an order.
   * Authoritative amount is determined entirely server-side.
   */
  async initializePayment(
    orderId: string,
    returnUrl?: string
  ): Promise<InitializePaymentResponse> {
    try {
      const res = await apiFetch<any>('/customer/payments/chapa/initialize', {
        method: 'POST',
        body: JSON.stringify({ orderId, returnUrl }),
      });
      return (res.data?.data || res.data) as InitializePaymentResponse;
    } catch (err: any) {
      // Fallback alias for customer-mobile route if needed
      try {
        const res = await apiFetch<any>('/customer-mobile/payments/chapa/initialize', {
          method: 'POST',
          body: JSON.stringify({ orderId, returnUrl }),
        });
        return (res.data?.data || res.data) as InitializePaymentResponse;
      } catch {
        throw err;
      }
    }
  },

  /**
   * Authoritatively fetches current payment status from the backend.
   * Triggers server-to-server verification check if appropriate.
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      const res = await apiFetch<any>(`/customer/payments/${paymentId}/status`);
      return (res.data?.data || res.data) as PaymentStatusResponse;
    } catch (err: any) {
      try {
        const res = await apiFetch<any>(`/customer-mobile/payments/${paymentId}/status`);
        return (res.data?.data || res.data) as PaymentStatusResponse;
      } catch {
        throw err;
      }
    }
  },

  /**
   * Retrieves paginated payment history for customer profile.
   */
  async getPaymentHistory(
    cursor?: string,
    limit: number = 20
  ): Promise<PaymentHistoryResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', String(limit));

    try {
      const res = await apiFetch<any>(`/customer/payments/history?${params.toString()}`);
      return (res.data?.data || res.data) as PaymentHistoryResponse;
    } catch (err: any) {
      try {
        const res = await apiFetch<any>(`/customer-mobile/payments/history?${params.toString()}`);
        return (res.data?.data || res.data) as PaymentHistoryResponse;
      } catch {
        throw err;
      }
    }
  },
};
