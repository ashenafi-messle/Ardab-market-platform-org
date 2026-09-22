// ==============================================================================
// Ardab Market - Customer Support Types
// ==============================================================================

export type SupportTicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED';

export type SupportTicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type SupportSenderType = 'CUSTOMER' | 'SUBADMIN' | 'SYSTEM';

export interface SupportCategory {
  id: string;
  name: string;
  description?: string | null;
}

export interface SupportMessage {
  id: string;
  body: string;
  senderType: SupportSenderType;
  isSelf: boolean;
  senderName: string;
  createdAt: string;
}

export interface SupportTicketListItem {
  id: string;
  ticketNumber: string;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: string;
  categoryId?: string | null;
  orderNumber?: string | null;
  orderId?: string | null;
  city: string;
  lastMessageAt: string | null;
  createdAt: string;
  messagesCount: number;
  hasUnreadReply: boolean;
}

export interface SupportTicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  city: string;
  category: string;
  categoryId?: string | null;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    placedAt?: string | null;
  } | null;
  createdAt: string;
  lastMessageAt?: string | null;
  messages: SupportMessage[];
}

export interface CustomerOrderOption {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface SupportPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CreateSupportRequestPayload {
  subject: string;
  message: string;
  categoryId?: string | null;
  orderId?: string | null;
  priority?: SupportTicketPriority;
}

export interface ReplySupportMessagePayload {
  message: string;
  idempotencyKey?: string;
}
