/**
 * Ardab Market - Agent Mobile Application Types
 */

export type AccountStatus = 'ACTIVE' | 'PENDING_ACTIVATION' | 'SUSPENDED';

export interface AgentProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  agentReference: string;
  accountStatus: AccountStatus;
  commissionRate: number; // e.g. 5.0 for 5%
  city: string;
  registeredAt: string;
}

export interface AgentDashboard {
  totalBalance: number; // Current payable / available balance
  totalEarned: number; // Lifetime accumulated commission
  pendingCommission: number; // Commission awaiting order acceptance/completion
  approvedCommission: number; // Approved & ready for disbursement
  paidCommission: number; // Already paid out
  totalCustomers: number;
  activeCustomers: number;
  totalOrders: number;
  acceptedOrders: number;
  pendingOrders: number;
  completedOrders: number;
  assignedCommissionRate: number;
}

export type CustomerIntegrationStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'INACTIVE';

export interface AgentCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  integratedAt: string;
  integrationStatus: CustomerIntegrationStatus;
  attributedOrdersCount: number;
  totalOrderValue: number;
  generatedCommission: number;
}

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface AgentOrder {
  id: string;
  orderReference: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  orderDate: string;
  orderTotal: number;
  commissionRate: number; // Rate applied to this order
  commissionBasis: string; // Basis explanation e.g. "Order Subtotal (ETB 1,500.00)"
  commissionAmount: number;
  orderStatus: OrderStatus;
  commissionStatus: CommissionStatus;
  itemsCount: number;
  items?: OrderItem[];
  paymentMethod: string;
}

export type NotificationType =
  | 'ACCEPTED_ORDER'
  | 'COMMISSION_CREDITED'
  | 'COMMISSION_APPROVED'
  | 'COMMISSION_PAID'
  | 'SYSTEM';

export interface AgentNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedOrderId?: string;
  orderReference?: string;
  customerName?: string;
  orderValue?: number;
  commissionAmount?: number;
  isRead: boolean;
  createdAt: string;
}

export interface AgentCommissionTransaction {
  id: string;
  transactionReference: string;
  orderId: string;
  orderReference: string;
  customerName: string;
  commissionRate: number;
  commissionBasis: number;
  commissionAmount: number;
  transactionDate: string;
  status: CommissionStatus;
}

export interface SavedAgentCredentials {
  email: string;
  savedAt: string;
  hasPasswordSaved: boolean;
}

