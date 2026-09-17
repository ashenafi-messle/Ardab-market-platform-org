export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_DELIVERY'
  | 'ASSIGNED_TO_TRIP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'RETURNED'
  | 'REJECTED';

export interface OrderItem {
  id?: string;
  productId: string;
  productName: string;
  itemCode?: string;
  unit?: string;
  sellerId?: string;
  sellerName?: string;
  quantity: number;
  unitPriceEtb: number;
  totalPriceEtb: number;
  unitWeightKg: number;
  totalWeightKg: number;
}

export interface OrderTimelineEvent {
  id?: string;
  status: OrderStatus;
  timestamp: string;
  description: string;
  actor: string;
}

export interface OrderDeliveryAddressSnapshot {
  recipientName: string;
  phone: string;
  city: string;
  deliveryZone?: string;
  neighborhood?: string;
  addressLine: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface OrderSummaryMetrics {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  todayOrders: number;
  confirmedOrders: number;
  readyOrders: number;
}

export interface Order {
  id: string; // UUID
  orderNumber?: string; // Human-readable e.g. "ORD-2026-000001"
  customerId: string;
  customerName: string;
  customerCode?: string;
  customerPhone: string;
  customerEmail?: string | null;
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa' | string;
  deliveryZone: string;
  deliveryAddress: string;
  deliveryAddressSnapshot?: OrderDeliveryAddressSnapshot | null;
  items: OrderItem[];
  subtotalEtb: number;
  deliveryFeeEtb: number;
  discountEtb?: number;
  taxEtb?: number;
  totalEtb: number;
  totalWeightKg: number;
  currency?: string;
  paymentMethod: string;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  orderStatus: OrderStatus;
  customerNote?: string | null;
  internalNote?: string | null;
  placedAt?: string;
  confirmedAt?: string | null;
  processingAt?: string | null;
  readyAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
  assignedTripId?: string;
  assignedVehicleId?: string;
  assignedDriverName?: string;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}
