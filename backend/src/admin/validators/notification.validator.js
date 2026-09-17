// ==============================================================================
// Ardab Market - Notification & Operational Alert Request Validators (Zod Schemas)
// ==============================================================================

import { z } from 'zod';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_PRIORITIES,
} from '../constants/notificationConstants.js';

const TYPE_VALUES = Object.values(NOTIFICATION_TYPES);
const CATEGORY_VALUES = Object.values(NOTIFICATION_CATEGORIES);
const SEVERITY_VALUES = Object.values(NOTIFICATION_SEVERITIES);
const PRIORITY_VALUES = Object.values(NOTIFICATION_PRIORITIES);

/**
 * Validates query parameters for listing notifications and operational alerts.
 */
export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  category: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || CATEGORY_VALUES.includes(val), {
      message: `Category must be one of: ALL, ${CATEGORY_VALUES.join(', ')}`,
    }),
  type: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || TYPE_VALUES.includes(val), {
      message: `Type must be one of: ALL, ${TYPE_VALUES.join(', ')}`,
    }),
  severity: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || SEVERITY_VALUES.includes(val), {
      message: `Severity must be one of: ALL, ${SEVERITY_VALUES.join(', ')}`,
    }),
  priority: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || PRIORITY_VALUES.includes(val), {
      message: `Priority must be one of: ALL, ${PRIORITY_VALUES.join(', ')}`,
    }),
  isAlert: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  isRead: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  isAcknowledged: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  tab: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        ['ALL', 'ALERTS', 'UNREAD', 'ORDER', 'DELIVERY', 'FLEET', 'SECURITY', 'SYSTEM'].includes(val),
      {
        message: 'Invalid tab filter',
      }
    ),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'priority', 'severity', 'isRead']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Validates manual or programmatic creation of a notification / alert.
 */
export const createNotificationSchema = z.object({
  type: z.enum(TYPE_VALUES).default('NOTIFICATION'),
  category: z.enum(CATEGORY_VALUES).default('SYSTEM'),
  title: z.string().min(1, 'Title is required').max(255),
  message: z.string().min(1, 'Message is required'),
  severity: z.enum(SEVERITY_VALUES).default('INFO'),
  priority: z.enum(PRIORITY_VALUES).default('NORMAL'),
  isAlert: z.boolean().default(false),
  entityType: z.string().max(64).optional().nullable(),
  entityId: z.string().max(64).optional().nullable(),
  actionUrl: z.string().max(255).optional().nullable(),
  metadata: z.any().optional().nullable(),
  targetRole: z.string().optional().nullable(),
  recipientAdminIds: z.array(z.string()).optional(),
});

/**
 * Validates acknowledging an operational alert.
 */
export const acknowledgeAlertSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * Validates bulk mark as read.
 */
export const bulkMarkAsReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1, 'At least one notification ID must be provided'),
});

/**
 * Validates bulk acknowledgement of operational alerts.
 */
export const bulkAcknowledgeSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1, 'At least one notification ID must be provided'),
  notes: z.string().max(1000).optional().nullable(),
});
