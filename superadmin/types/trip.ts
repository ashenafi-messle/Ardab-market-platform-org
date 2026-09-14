export type TripStatus =
  | 'PLANNING'
  | 'LOADING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Trip {
  id: string; // e.g. "TRP-1042"
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  vehicleId: string;
  vehicleRegistration: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  totalCapacityKg: number; // 5000 KG
  currentLoadKg: number;
  remainingCapacityKg: number;
  utilizationPercentage: number;
  orderIds: string[];
  orderCount: number;
  pickupHub: string;
  deliveryZones: string[];
  status: TripStatus;
  createdTime: string;
  startTime?: string;
  estimatedCompletionTime?: string;
  completedTime?: string;
}
