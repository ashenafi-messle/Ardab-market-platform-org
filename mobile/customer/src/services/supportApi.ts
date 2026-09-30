// ==============================================================================
// Ardab Market - Mobile Customer Support API Service
// ==============================================================================

import { apiFetch } from '@/constants/api';

export interface MobileSupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  priority: string;
  category: string;
  orderNumber?: string | null;
  orderId?: string | null;
  createdAt: string;
  lastMessageAt?: string | null;
  messagesCount?: number;
  hasUnreadReply?: boolean;
}

export interface MobileSupportTicketDetail extends MobileSupportTicket {
  messages: Array<{
    id: string;
    body: string;
    senderType: 'CUSTOMER' | 'SUBADMIN' | 'SYSTEM';
    isSelf: boolean;
    senderName: string;
    createdAt: string;
  }>;
}

export const supportApi = {
  /**
   * Fetches customer's support requests / tickets
   */
  async getTickets(): Promise<MobileSupportTicket[]> {
    try {
      let res = await apiFetch<any>('/customer/support');
      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/support');
      }

      if (res.ok && res.data) {
        const raw = res.data.data?.items || res.data.items || res.data.data || res.data;
        if (Array.isArray(raw)) {
          return raw.map((t: any) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            subject: t.subject,
            status: t.status,
            priority: t.priority || 'NORMAL',
            category: t.category || 'General Support',
            orderNumber: t.orderNumber || null,
            orderId: t.orderId || null,
            createdAt: t.createdAt,
            lastMessageAt: t.lastMessageAt || t.createdAt,
            messagesCount: t.messagesCount || 0,
            hasUnreadReply: Boolean(t.hasUnreadReply),
          }));
        }
      }
      return [];
    } catch (err) {
      console.warn('[supportApi] Error fetching tickets:', err);
      return [];
    }
  },

  /**
   * Fetches single ticket with full message history
   */
  async getTicketDetails(ticketId: string): Promise<MobileSupportTicketDetail | null> {
    try {
      let res = await apiFetch<any>(`/customer/support/${ticketId}`);
      if (!res.ok) {
        res = await apiFetch<any>(`/customer-mobile/support/${ticketId}`);
      }

      if (res.ok && res.data) {
        const t = res.data.data || res.data;
        return {
          id: t.id,
          ticketNumber: t.ticketNumber,
          subject: t.subject,
          status: t.status,
          priority: t.priority || 'NORMAL',
          category: t.category || 'General Support',
          orderNumber: t.order?.orderNumber || t.orderNumber || null,
          orderId: t.order?.id || t.orderId || null,
          createdAt: t.createdAt,
          lastMessageAt: t.lastMessageAt,
          messages: Array.isArray(t.messages)
            ? t.messages.map((m: any) => ({
                id: m.id,
                body: m.body,
                senderType: m.senderType,
                isSelf: m.senderType === 'CUSTOMER' || m.isSelf === true,
                senderName: m.senderName || (m.senderType === 'CUSTOMER' ? 'You' : 'Ardab Support'),
                createdAt: m.createdAt,
              }))
            : [],
        };
      }
      return null;
    } catch (err) {
      console.warn('[supportApi] Error fetching ticket details:', err);
      return null;
    }
  },

  /**
   * Submits a new support request to Ardab Market Support
   */
  async createTicket(payload: {
    subject: string;
    message: string;
    categoryId?: string;
    orderId?: string;
    priority?: string;
  }): Promise<{ id: string; ticketNumber: string; message: string }> {
    let res = await apiFetch<any>('/customer/support', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      res = await apiFetch<any>('/customer-mobile/support', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const errorMsg = res.data?.message || res.data?.error?.message || 'Failed to submit support request';
      throw new Error(errorMsg);
    }

    const data = res.data.data || res.data;
    return {
      id: data.id,
      ticketNumber: data.ticketNumber,
      message: data.message || `Your support request #${data.ticketNumber} has been received.`,
    };
  },

  /**
   * Replies to an existing support ticket
   */
  async replyTicket(ticketId: string, message: string): Promise<any> {
    let res = await apiFetch<any>(`/customer/support/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      res = await apiFetch<any>(`/customer-mobile/support/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    }

    if (!res.ok) {
      const errorMsg = res.data?.message || 'Failed to send reply';
      throw new Error(errorMsg);
    }

    return res.data.data || res.data;
  },

  /**
   * Fetches customer's recent orders for linking to support ticket
   */
  async getCustomerOrders(): Promise<Array<{ id: string; orderNumber: string; totalAmount: any }>> {
    try {
      let res = await apiFetch<any>('/customer/support/orders');
      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/support/orders');
      }

      if (res.ok && res.data) {
        return res.data.data || res.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },
};
