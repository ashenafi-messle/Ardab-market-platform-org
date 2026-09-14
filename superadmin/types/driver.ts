export type DriverStatus = 'ACTIVE' | 'ON_TRIP' | 'OFF_DUTY' | 'ON_LEAVE';

export interface Driver {
  id: string; // e.g. "DRV-101"
  name: string;
  phone: string;
  email: string;
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  licenseNumber: string;
  status: DriverStatus;
  assignedVehicleId?: string;
  assignedVehicleReg?: string;
  currentTripId?: string;
  activeDeliveriesCount: number;
  completedDeliveriesCount: number;
  rating: number; // e.g. 4.9
  onTimeDeliveryRate: number; // e.g. 98.4%
  joinedDate: string;
}
