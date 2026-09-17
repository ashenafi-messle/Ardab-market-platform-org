// ==============================================================================
// Ardab Market - Security & Super Admin Request Validators (Zod)
// ==============================================================================

import { z } from 'zod';

const SECURITY_SEVERITY_VALUES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SECURITY_SOURCE_VALUES = [
  'CUSTOMER_WEB',
  'CUSTOMER_MOBILE',
  'SELLER_WEB',
  'SELLER_MOBILE',
  'SUBADMIN_WEB',
  'SUPERADMIN_WEB',
  'API',
  'AUTH_SERVICE',
  'SYSTEM',
];
const SECURITY_ACTOR_VALUES = [
  'CUSTOMER',
  'SELLER',
  'SUBADMIN',
  'SUPER_ADMIN',
  'SYSTEM',
  'ANONYMOUS',
];
const SECURITY_ALERT_STATUS_VALUES = [
  'OPEN',
  'ACKNOWLEDGED',
  'INVESTIGATING',
  'RESOLVED',
  'DISMISSED',
];
const IP_RULE_STATUS_VALUES = ['BLOCKED', 'WHITELISTED'];
const USER_STATUS_VALUES = ['ACTIVE', 'SUSPENDED', 'INACTIVE'];

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID parameter is required'),
});

export const alertIdParamSchema = z.object({
  id: z.string().min(1, 'Alert ID is required'),
});

// Super Admin Management Validators
export const createSuperAdminSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address is required').toLowerCase(),
  phone: z.string().optional().default('+251 91 000 0000'),
  assignedCities: z.array(z.string()).optional().default(['All Cities']),
  initialPassword: z.string().min(8, 'Initial password must be at least 8 characters').optional(),
});

export const updateSuperAdminSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().optional(),
  assignedCities: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
});

export const toggleStatusSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const resetPasswordSchema = z.object({
  tempPassword: z.string().min(8).optional(),
});

export const listSuperAdminsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  status: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || USER_STATUS_VALUES.includes(val), {
      message: `Status must be one of: ALL, ${USER_STATUS_VALUES.join(', ')}`,
    }),
  sortBy: z.enum(['createdAt', 'name', 'email', 'lastLogin']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Security Events Validators
export const listSecurityEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  eventType: z.string().optional(),
  severity: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || SECURITY_SEVERITY_VALUES.includes(val), {
      message: `Severity must be one of: ALL, ${SECURITY_SEVERITY_VALUES.join(', ')}`,
    }),
  source: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || SECURITY_SOURCE_VALUES.includes(val), {
      message: `Source must be one of: ALL, ${SECURITY_SOURCE_VALUES.join(', ')}`,
    }),
  actorType: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || SECURITY_ACTOR_VALUES.includes(val), {
      message: `Actor type must be one of: ALL, ${SECURITY_ACTOR_VALUES.join(', ')}`,
    }),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['occurredAt', 'createdAt', 'severity']).default('occurredAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Security Alerts Validators
export const listSecurityAlertsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  status: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || SECURITY_ALERT_STATUS_VALUES.includes(val), {
      message: `Status must be one of: ALL, ${SECURITY_ALERT_STATUS_VALUES.join(', ')}`,
    }),
  severity: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || SECURITY_SEVERITY_VALUES.includes(val), {
      message: `Severity must be one of: ALL, ${SECURITY_SEVERITY_VALUES.join(', ')}`,
    }),
  source: z.string().optional(),
  sortBy: z.enum(['detectedAt', 'createdAt', 'severity']).default('detectedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateSecurityAlertSchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']),
  action: z.string().max(100).optional(),
  resolutionNotes: z.string().max(1000).optional(),
});

// IP Firewall Rules Validators
export const addIpRuleSchema = z.object({
  ipAddress: z.string().min(7, 'Valid IP address required').max(100),
  reason: z.string().min(3, 'Reason is required').max(500),
  status: z.enum(['BLOCKED', 'WHITELISTED']).default('BLOCKED'),
  expiresAt: z.string().datetime().optional().nullable(),
});

// Detection Rules Validators
export const createDetectionRuleSchema = z.object({
  name: z.string().min(3).max(150),
  description: z.string().max(500).optional(),
  eventType: z.string().min(2).max(100),
  threshold: z.coerce.number().int().positive().default(5),
  timeWindowSeconds: z.coerce.number().int().positive().default(600),
  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
  isActive: z.boolean().default(true),
});
