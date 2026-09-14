export interface SalesByCity {
  city: string;
  revenueEtb: number;
  orderCount: number;
  deliveredPercentage: number;
}

export interface SalesByCategory {
  category: string;
  revenueEtb: number;
  weightSoldKg: number;
  percentage: number;
}

export interface OperationalPerformance {
  deliverySuccessRate: number; // e.g. 98.6%
  avgDeliveryTimeMinutes: number; // e.g. 42 mins
  fleetCapacityUtilization: number; // e.g. 84.5%
  activeFleetCount: number;
  customerGrowthRate: number; // e.g. 14.2%
}
