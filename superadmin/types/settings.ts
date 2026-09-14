export interface Neighborhood {
  id: string;
  name: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  code: string;
  cityId: string;
  baseDeliveryFeeEtb: number;
  perKgFeeEtb: number;
  estimatedDeliveryHours: string;
  neighborhoods: Neighborhood[];
  isActive: boolean;
}

export interface CityConfig {
  id: string;
  name: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  country: 'Ethiopia';
  hubAddress: string;
  contactPhone: string;
  isActive: boolean;
  totalVehicles: number;
  totalDrivers: number;
  zones: DeliveryZone[];
}

export interface PlatformSettings {
  platformName: string;
  supportPhone: string;
  supportEmail: string;
  defaultVehicleCapacityKg: number; // 5000 KG
  orderCancellationGracePeriodMinutes: number;
  enableTelebirrAutoVerification: boolean;
  enableCbeBirrAutoVerification: boolean;
  maintenanceNoticeActive: boolean;
}
