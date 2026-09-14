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
  | 'RETURNED';

export interface OrderItem {
  productId: string;
  productName: string;
  sellerId?: string;
  sellerName?: string;
  quantity: number;
  unitPriceEtb: number;
  totalPriceEtb: number;
  unitWeightKg: number;
  totalWeightKg: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  description: string;
  actor: string;
}

export interface Order {
  id: string; // e.g. "ORD-9402"
  customerId: string;
  customerName: string;
  customerPhone: string;
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  deliveryZone: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotalEtb: number;
  deliveryFeeEtb: number;
  totalEtb: number;
  totalWeightKg: number;
  paymentMethod: 'TELEBIRR' | 'CBE_BIRR' | 'CASH_ON_DELIVERY';
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  orderStatus: OrderStatus;
  assignedTripId?: string;
  assignedVehicleId?: string;
  assignedDriverName?: string;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}
