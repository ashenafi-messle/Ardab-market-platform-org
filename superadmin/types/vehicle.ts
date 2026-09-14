export type VehicleStatus =
  | 'AVAILABLE'
  | 'ON_TRIP'
  | 'LOADING'
  | 'MAINTENANCE'
  | 'OFFLINE';

export interface Vehicle {
  id: string; // e.g. "ARD-001"
  registrationNumber: string; // e.g. "ET-3-A4928"
  model: string; // e.g. "Isuzu NPR Cargo 5T"
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  capacityKg: number; // 5000 KG business model
  currentLoadKg: number;
  remainingCapacityKg: number;
  utilizationPercentage: number;
  status: VehicleStatus;
  assignedDriverId?: string;
  assignedDriverName?: string;
  currentTripId?: string;
  currentLocation: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  fuelLevelPercentage: number;
}
