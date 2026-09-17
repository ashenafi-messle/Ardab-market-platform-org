export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'SUB_ADMIN' | 'OPERATIONS_MANAGER' | 'DISPATCHER';
  status: 'ACTIVE' | 'SUSPENDED';
  phone?: string;
  lastLogin: string;
  assignedCities: string[];
  createdAt?: string;
  initialPassword?: string;
}

export interface PermissionGroup {
  module: string;
  description: string;
  permissions: {
    key: string;
    label: string;
    granted: boolean;
  }[];
}

export interface AuditLog {
  id: string;
  adminName: string;
  adminEmail: string;
  action: string;
  entity: string;
  entityId: string;
  ipAddress: string;
  timestamp: string;
  changesSummary?: string;
  status?: 'SUCCESS' | 'WARNING' | 'CRITICAL';
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  startedAt: string;
  lastActive: string;
  status: 'ACTIVE' | 'REVOKED';
}

export interface SecurityAlert {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  ipAddress?: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  status?: string;
}

export interface IpBlockRule {
  id: string;
  ipAddress: string;
  reason: string;
  blockedAt: string;
  blockedBy: string;
  expiresAt?: string;
  status: 'BLOCKED' | 'WHITELISTED';
}

export interface FailedLoginLog {
  id: string;
  attemptedEmail: string;
  ipAddress: string;
  timestamp: string;
  city: string;
  reason: string;
  blocked: boolean;
}

export interface SecurityStatistics {
  activeSuperAdmins: number;
  totalSuperAdmins: number;
  activeSessions: number;
  openAlerts: number;
  unresolvedAlerts?: number;
  criticalAlerts: number;
  failedLogins24h: number;
  blockedIps: number;
  totalEvents: number;
}

export interface SecurityEventItem {
  id: string;
  eventType: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  actorType: string;
  actorEmail?: string;
  ipAddress?: string;
  endpoint?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}
