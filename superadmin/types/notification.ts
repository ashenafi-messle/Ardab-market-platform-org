export type NotificationType = 'NOTIFICATION' | 'OPERATIONAL_ALERT' | 'SYSTEM_ANNOUNCEMENT';

export type NotificationCategory =
  | 'ORDER'
  | 'DELIVERY'
  | 'FLEET'
  | 'SECURITY'
  | 'SYSTEM'
  | 'PAYMENT'
  | 'CUSTOMER';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  severity: NotificationSeverity;
  priority: NotificationPriority;
  isAlert: boolean;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  targetRole: string | null;
  adminId: string | null;
  createdAt: string;
  expiresAt: string | null;

  isRead: boolean;
  readAt: string | null;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedById: string | null;
  acknowledgementNotes: string | null;

  admin?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface NotificationSummary {
  total: number;
  unreadCount: number;
  alertCount: number;
  criticalCount: number;
  byCategory: Record<NotificationCategory, number>;
  recentAlerts: Notification[];
}
