export type TicketCategory =
  | 'ORDER_ISSUE'
  | 'DELIVERY_DELAY'
  | 'PAYMENT_DISPUTE'
  | 'PRODUCT_QUALITY'
  | 'ACCOUNT_INQUIRY';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketMessage {
  id: string;
  senderName: string;
  senderType: 'CUSTOMER' | 'SUB_ADMIN' | 'SYSTEM';
  message: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string;
  orderId?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  resolutionNotes?: string;
}
