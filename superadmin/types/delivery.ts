export type DeliveryFilterStatus =
  | 'ALL'
  | 'ACTIVE'
  | 'WAITING'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'FAILED';

export interface DeliveryItemSummary {
  orderId: string;
  customerName: string;
  address: string;
  zone: string;
  weightKg: number;
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'FAILED';
}

export interface DeliveryTripView {
  tripId: string;
  vehicleId: string;
  vehicleReg: string;
  driverName: string;
  driverPhone: string;
  city: string;
  destinationZone: string;
  orderCount: number;
  currentLoadKg: number;
  capacityKg: number; // 5000 KG
  utilizationPercentage: number;
  status: 'LOADING' | 'IN_TRANSIT' | 'COMPLETED' | 'WAITING' | 'FAILED';
  startedAt?: string;
  estimatedArrival?: string;
  orders: DeliveryItemSummary[];
}
