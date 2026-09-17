// ==============================================================================
// Ardab Market - Maintenance & System Health Request Validators (Zod)
// ==============================================================================

import { z } from 'zod';

const MAINTENANCE_STATUS_VALUES = ['PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const MAINTENANCE_TYPE_VALUES = ['SCHEDULED', 'EMERGENCY', 'PREVENTIVE', 'CORRECTIVE'];
const MAINTENANCE_PRIORITY_VALUES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
const MAINTENANCE_SCOPE_VALUES = ['PLATFORM', 'SERVICE', 'CITY', 'INFRASTRUCTURE', 'DATABASE', 'API'];
const INCIDENT_STATUS_VALUES = ['OPEN', 'INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED', 'CLOSED'];
const INCIDENT_SEVERITY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const HEALTH_STATUS_VALUES = ['HEALTHY', 'DEGRADED', 'MAINTENANCE', 'OFFLINE'];
const TASK_CATEGORY_VALUES = ['DATABASE', 'CACHE', 'STORAGE', 'SECURITY'];

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const componentIdParamSchema = z.object({
  componentId: z.string().min(1, 'Component ID is required'),
});

// ---------------------------------------------------------------------------
// Maintenance Windows
// ---------------------------------------------------------------------------

export const listMaintenanceWindowsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .string()
    .optional()
    .refine((v) => !v || v === 'ALL' || MAINTENANCE_STATUS_VALUES.includes(v), {
      message: `Status must be ALL or one of: ${MAINTENANCE_STATUS_VALUES.join(', ')}`,
    }),
  maintenanceType: z
    .string()
    .optional()
    .refine((v) => !v || v === 'ALL' || MAINTENANCE_TYPE_VALUES.includes(v), {
      message: `maintenanceType must be ALL or one of: ${MAINTENANCE_TYPE_VALUES.join(', ')}`,
    }),
  priority: z
    .string()
    .optional()
    .refine((v) => !v || v === 'ALL' || MAINTENANCE_PRIORITY_VALUES.includes(v), {
      message: `priority must be ALL or one of: ${MAINTENANCE_PRIORITY_VALUES.join(', ')}`,
    }),
  cityId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const createMaintenanceWindowSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  maintenanceType: z.enum(MAINTENANCE_TYPE_VALUES).optional().default('SCHEDULED'),
  priority: z.enum(MAINTENANCE_PRIORITY_VALUES).optional().default('NORMAL'),
  scope: z.enum(MAINTENANCE_SCOPE_VALUES).optional().default('SERVICE'),
  affectedServices: z.array(z.string()).optional().default([]),
  announcedToUsers: z.boolean().optional().default(true),
  cityId: z.string().optional(),
  scheduledStart: z.string().min(1, 'scheduledStart is required'),
  scheduledEnd: z.string().optional(),
});

export const updateMaintenanceWindowStatusSchema = z.object({
  status: z.enum(MAINTENANCE_STATUS_VALUES, {
    errorMap: () => ({ message: `Status must be one of: ${MAINTENANCE_STATUS_VALUES.join(', ')}` }),
  }),
  reason: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Health Checks
// ---------------------------------------------------------------------------

export const recordHealthCheckSchema = z.object({
  status: z.enum(HEALTH_STATUS_VALUES, {
    errorMap: () => ({ message: `Status must be one of: ${HEALTH_STATUS_VALUES.join(', ')}` }),
  }),
  latencyMs: z.coerce.number().int().nonnegative().optional(),
  httpStatus: z.coerce.number().int().optional(),
  message: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  cityId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export const listIncidentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .string()
    .optional()
    .refine((v) => !v || v === 'ALL' || INCIDENT_STATUS_VALUES.includes(v), {
      message: `Status must be ALL or one of: ${INCIDENT_STATUS_VALUES.join(', ')}`,
    }),
  severity: z
    .string()
    .optional()
    .refine((v) => !v || v === 'ALL' || INCIDENT_SEVERITY_VALUES.includes(v), {
      message: `Severity must be ALL or one of: ${INCIDENT_SEVERITY_VALUES.join(', ')}`,
    }),
  cityId: z.string().optional(),
  componentId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const createIncidentSchema = z.object({
  title: z.string().min(3, 'Title is required').max(200),
  description: z.string().optional(),
  incidentType: z.string().optional().default('SERVICE_DEGRADATION'),
  severity: z.enum(INCIDENT_SEVERITY_VALUES).optional().default('MEDIUM'),
  componentId: z.string().optional(),
  cityId: z.string().optional(),
});

export const updateIncidentSchema = z.object({
  status: z.enum(INCIDENT_STATUS_VALUES).optional(),
  resolutionNotes: z.string().optional(),
  assignedToId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Maintenance Tasks
// ---------------------------------------------------------------------------

export const listTasksQuerySchema = z.object({
  category: z
    .string()
    .optional()
    .refine((v) => !v || v === 'ALL' || TASK_CATEGORY_VALUES.includes(v), {
      message: `Category must be ALL or one of: ${TASK_CATEGORY_VALUES.join(', ')}`,
    }),
  status: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Fleet Equipment Logs
// ---------------------------------------------------------------------------

export const listEquipmentLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  cityId: z.string().optional(),
  cityName: z.string().optional(),
  status: z.string().optional(),
  vehicleId: z.string().optional(),
});
