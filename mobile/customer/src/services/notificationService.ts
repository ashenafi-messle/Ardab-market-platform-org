// ==============================================================================
// Ardab Market - Mobile Customer Notification Service
// ==============================================================================

import { apiFetch } from '@/constants/api';
import { NotificationItem } from '@/types';

export interface NotificationsResponse {
  notifications: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  unreadCount: number;
}

/**
 * Normalizes backend notification to UI format
 */
function normalizeNotification(raw: any): NotificationItem {
  const isRead = Boolean(raw.isRead ?? raw.read ?? false);
  return {
    id: raw.id,
    recipientId: raw.recipientId || raw.id,
    type: raw.type || 'SYSTEM',
    title: raw.title || 'Notification',
    body: raw.body || raw.message || '',
    read: isRead,
    isRead,
    imageUrl: raw.imageUrl || null,
    deepLink: raw.deepLink || raw.actionUrl || null,
    actionUrl: raw.deepLink || raw.actionUrl || null,
    entityType: raw.entityType || null,
    entityId: raw.entityId || null,
    readAt: raw.readAt || null,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

/**
 * Fetch paginated notifications for authenticated customer
 */
export async function fetchNotifications(options: {
  page?: number;
  limit?: number;
  unread?: boolean;
} = {}): Promise<NotificationsResponse> {
  const queryParts: string[] = [];
  queryParts.push(`page=${options.page || 1}`);
  queryParts.push(`limit=${options.limit || 20}`);
  if (options.unread) {
    queryParts.push('unread=true');
  }

  const endpoint = `/customer/notifications?${queryParts.join('&')}`;
  const res = await apiFetch<any>(endpoint, {
    method: 'GET',
  });

  if (!res.ok || !res.data) {
    // Graceful empty fallback
    return {
      notifications: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      unreadCount: 0,
    };
  }

  const rawData = res.data.data || res.data;
  const rawList = Array.isArray(rawData.notifications) ? rawData.notifications : [];
  const normalizedList = rawList.map(normalizeNotification);

  return {
    notifications: normalizedList,
    pagination: rawData.pagination || {
      page: options.page || 1,
      limit: options.limit || 20,
      total: normalizedList.length,
      totalPages: Math.ceil(normalizedList.length / (options.limit || 20)),
      hasNextPage: false,
      hasPreviousPage: false,
    },
    unreadCount: typeof rawData.unreadCount === 'number' ? rawData.unreadCount : 0,
  };
}

/**
 * Fetch authoritative unread count
 */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const res = await apiFetch<any>('/customer/notifications/unread-count', {
      method: 'GET',
    });

    if (res.ok && res.data) {
      const raw = res.data.data || res.data;
      return typeof raw.count === 'number' ? raw.count : 0;
    }
  } catch {
    // Non-critical fallback
  }
  return 0;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/customer/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Mark all customer notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const res = await apiFetch('/customer/notifications/read-all', {
      method: 'PATCH',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Soft hide a notification from customer view
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/customer/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}
