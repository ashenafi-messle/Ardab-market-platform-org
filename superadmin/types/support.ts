// ==============================================================================
// Ardab Market - Customer Support Data Models & Types
// ==============================================================================

export type TicketCategory =
  | 'ORDER_ISSUE'
  | 'DELIVERY_DELAY'
  | 'PAYMENT_DISPUTE'
  | 'PRODUCT_QUALITY'
  | 'ACCOUNT_INQUIRY'
  | 'ORDER'
  | 'DELIVERY'
  | 'PAYMENT'
  | 'ACCOUNT'
  | 'PRODUCT'
  | 'SELLER'
  | 'REFUND'
  | 'TECHNICAL'
  | 'OTHER'
  | string;

export type TicketPriority = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED';

export type SenderType = 'CUSTOMER' | 'SUBADMIN' | 'SUB_ADMIN' | 'ADMIN' | 'SYSTEM';

export type MessageType = 'MESSAGE' | 'INTERNAL_NOTE' | 'SYSTEM_EVENT';

export type EmailDeliveryStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED';

export interface SupportCategory {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface TicketMessage {
  id: string;
  ticketId?: string;
  senderUserId?: string | null;
  senderName: string;
  senderType: SenderType;
  messageType?: MessageType;
  body?: string;
  message: string; // backward compatibility with existing UI
  isInternal?: boolean;
  emailStatus?: EmailDeliveryStatus | null;
  emailMessageId?: string | null;
  timestamp: string;
  createdAt?: string;
}

export interface SupportEmailLog {
  id: string;
  ticketId: string;
  messageId: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  provider: string;
  providerMessageId?: string | null;
  status: EmailDeliveryStatus;
  attemptCount: number;
  lastError?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
}

export interface SupportTicketStatusHistory {
  id: string;
  oldStatus?: string | null;
  newStatus: string;
  reason?: string | null;
  changedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface SupportTicketAssignmentHistory {
  id: string;
  assignedFrom?: string | null;
  assignedTo?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  city: string;
  subject: string;
  description?: string | null;
  category: string;
  categoryId?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string;
  assignedSubadminId?: string | null;
  assignedSubadmin?: {
    id: string;
    name: string;
    email: string;
  } | null;
  orderId?: string | null;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    paymentStatus: string;
  } | null;
  messages: TicketMessage[];
  statusHistory?: SupportTicketStatusHistory[];
  assignmentHistory?: SupportTicketAssignmentHistory[];
  emailLogs?: SupportEmailLog[];
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  resolutionNotes?: string | null;
}

export interface SupportStatistics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingForCustomer: number;
  pendingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  activeQueueCount: number;
  urgentTickets: number;
  unassignedTickets: number;
  averageResolutionMinutes: number;
  categories: string[];
}
