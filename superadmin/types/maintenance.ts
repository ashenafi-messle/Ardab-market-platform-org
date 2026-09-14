export type ServiceHealthStatus = 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE' | 'OFFLINE';

export interface SystemService {
  id: string;
  name: string;
  category: 'CORE_API' | 'DATABASE' | 'GIS_ENGINE' | 'CACHE' | 'TELEMETRY' | 'PAYMENTS';
  status: ServiceHealthStatus;
  latencyMs: number;
  uptimePercentage: number;
  lastChecked: string;
  serverNode: string;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  affectedServices: string[];
  announcedToUsers: boolean;
  createdBy: string;
}

export interface MaintenanceTask {
  id: string;
  name: string;
  category: 'DATABASE' | 'CACHE' | 'STORAGE' | 'SECURITY';
  description: string;
  frequency: string;
  lastRun: string;
  status: 'SUCCESS' | 'RUNNING' | 'FAILED';
  lastDurationMs: number;
}

export interface EquipmentServiceLog {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  serviceType: string;
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  workshopLocation: string;
  costEtb: number;
  scheduledDate: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  technicianNotes?: string;
}
