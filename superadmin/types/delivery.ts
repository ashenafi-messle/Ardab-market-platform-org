// ==============================================================================
// Ardab Market Super Admin - Deliveries Type Definitions
// ==============================================================================

export type DeliveryStatus =
  | 'PENDING'
  | 'READY_FOR_ASSIGNMENT'
  | 'ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface DeliverySummaryMetrics {
  totalDeliveries: number;
  pendingDeliveries: number;
  readyDeliveries: number;
  assignedDeliveries: number;
  outForDelivery: number;
  deliveredToday: number;
  failedDeliveries: number;
  cancelledDeliveries: number;
}

export interface DeliveryCustomerSnapshot {
  id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string | null;
  city: string;
  profileImageUrl?: string | null;
}

export interface DeliveryOrderItem {
  id: string;
  productName: string;
  itemCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  weightPerUnit: number;
  totalWeight: number;
}

export interface DeliveryOrderSnapshot {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  totalWeight: number;
  paymentStatus: string;
  itemCount: number;
  items?: DeliveryOrderItem[];
}

export interface DeliveryTripSnapshot {
  id: string;
  tripNumber: string;
  status: string;
  city: string;
  pickupHub?: string | null;
  maxCapacityKg: number;
  totalWeightKg: number;
  vehicle?: {
    id: string;
    plateNumber: string;
    model: string;
  } | null;
  driver?: {
    id: string;
    driverCode: string;
    fullName: string;
    phone: string;
  } | null;
}

export interface DeliveryDriverSnapshot {
  id: string;
  driverCode: string;
  fullName: string;
  phone: string;
}

export interface DeliveryVehicleSnapshot {
  id: string;
  plateNumber: string;
  model: string;
}

export interface DeliveryTimelineEvent {
  id: string;
  action: string;
  fromStatus?: DeliveryStatus | null;
  toStatus?: DeliveryStatus | null;
  description: string;
  actor: string;
  timestamp: string;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  orderId: string;
  customerId: string;
  tripId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  status: DeliveryStatus;
  city: string;
  deliveryZone?: string | null;
  neighborhood?: string | null;
  addressLine: string;
  recipientName: string;
  recipientPhone: string;
  latitude?: number | null;
  longitude?: number | null;
  scheduledAt?: string | null;
  estimatedDeliveryAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  deliveryFee: number;
  deliveryNotes?: string | null;
  failureReason?: string | null;
  cancellationReason?: string | null;
  proofOfDeliveryUrl?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relational details
  customer?: DeliveryCustomerSnapshot | null;
  order?: DeliveryOrderSnapshot | null;
  trip?: DeliveryTripSnapshot | null;
  driver?: DeliveryDriverSnapshot | null;
  vehicle?: DeliveryVehicleSnapshot | null;
  activities?: DeliveryTimelineEvent[];
}

export interface AvailableTrip {
  id: string;
  tripNumber: string;
  city: string;
  status: string;
  pickupHub?: string | null;
  deliveryZones: string[];
  vehicleId?: string | null;
  vehiclePlate: string;
  vehicleModel: string;
  driverId?: string | null;
  driverName: string;
  driverPhone: string;
  capacityKg: number;
  currentLoadKg: number;
  remainingCapacityKg: number;
  utilizationPercentage: number;
  orderCount: number;
  createdAt: string;
}
