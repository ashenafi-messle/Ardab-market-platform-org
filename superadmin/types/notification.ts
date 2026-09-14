export type NotificationCategory =
  | 'SYSTEM'
  | 'ORDER'
  | 'DELIVERY'
  | 'SECURITY'
  | 'FLEET';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  actionUrl?: string;
}
