// ==============================================================================
// Ardab Market - Delivery Request Validators (Zod Schemas)
// ==============================================================================

import { z } from 'zod';
import { DELIVERY_STATUS } from '../constants/deliveryConstants.js';

const STATUS_ENUM_VALUES = Object.values(DELIVERY_STATUS);

/**
 * Validates query parameters for listing deliveries.
 */
export const deliveryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().optional(),
  city: z.string().optional(),
  deliveryZone: z.string().optional(),
  status: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || STATUS_ENUM_VALUES.includes(val), {
      message: `Status must be one of: ALL, ${STATUS_ENUM_VALUES.join(', ')}`,
    }),
  tripId: z.string().optional(),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
  endDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
  sortBy: z.enum(['deliveryNumber', 'createdAt', 'scheduledAt', 'deliveredAt', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Validates delivery creation for a confirmed order.
 */
export const createDeliverySchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
  deliveryNotes: z.string().max(1000).optional().nullable(),
});

/**
 * Validates generic status update.
 */
export const deliveryStatusUpdateSchema = z.object({
  status: z.enum(STATUS_ENUM_VALUES, {
    errorMap: () => ({ message: `Status must be one of: ${STATUS_ENUM_VALUES.join(', ')}` }),
  }),
  reason: z.string().max(500).optional(),
});

/**
 * Validates trip assignment.
 */
export const assignTripSchema = z.object({
  tripId: z.string().min(1, 'Trip ID is required'),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
});

/**
 * Validates delivery completion.
 */
export const completeDeliverySchema = z.object({
  proofOfDeliveryUrl: z.string().url().optional().nullable().or(z.literal('')),
  notes: z.string().max(500).optional().nullable(),
});

/**
 * Validates delivery failure report.
 */
export const failDeliverySchema = z.object({
  reason: z.string().min(3, 'Failure reason must be at least 3 characters long').max(500),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * Validates delivery cancellation.
 */
export const cancelDeliverySchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters long').max(500),
});
