// ==============================================================================
// Ardab Market - Customer Support Request Validators (Zod Schemas)
// ==============================================================================

import { z } from 'zod';
import {
  SUPPORT_TICKET_STATUS,
  SUPPORT_TICKET_PRIORITY,
} from '../constants/supportConstants.js';

const STATUS_VALUES = Object.values(SUPPORT_TICKET_STATUS);
const PRIORITY_VALUES = Object.values(SUPPORT_TICKET_PRIORITY);

export const ticketParamsSchema = z.object({
  id: z.string().min(1, 'Ticket ID is required'),
});

export const emailRetryParamsSchema = z.object({
  id: z.string().min(1, 'Ticket ID is required'),
  emailLogId: z.string().min(1, 'Email log ID is required'),
});

/**
 * Validates query parameters for listing support tickets
 */
export const supportQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || STATUS_VALUES.includes(val), {
      message: `Status must be one of: ALL, ${STATUS_VALUES.join(', ')}`,
    }),
  priority: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || PRIORITY_VALUES.includes(val), {
      message: `Priority must be one of: ALL, ${PRIORITY_VALUES.join(', ')}`,
    }),
  category: z.string().optional(),
  assignedTo: z.string().optional(),
  city: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastMessageAt', 'priority', 'status']).default('lastMessageAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Validates manual creation of a support ticket
 */
export const createTicketSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(255, 'Subject cannot exceed 255 characters'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  priority: z.enum(PRIORITY_VALUES).default('NORMAL'),
  orderId: z.string().optional(),
  city: z.string().default('Gondar'),
});

/**
 * Validates customer reply from subadmin
 */
export const replyMessageSchema = z.object({
  body: z.string().trim().min(1, 'Support reply message cannot be empty').max(10000, 'Message cannot exceed 10000 characters'),
  idempotencyKey: z.string().max(64).optional(),
});

/**
 * Validates internal staff note
 */
export const internalNoteSchema = z.object({
  body: z.string().trim().min(1, 'Internal note cannot be empty').max(10000, 'Internal note cannot exceed 10000 characters'),
});

/**
 * Validates status update
 */
export const updateStatusSchema = z.object({
  status: z.enum(STATUS_VALUES),
  notes: z.string().max(2000).optional(),
});

/**
 * Validates ticket assignment
 */
export const assignTicketSchema = z.object({
  assignedSubadminId: z.string().nullable(),
});

/**
 * Validates general ticket metadata update
 */
export const updateTicketSchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  categoryId: z.string().nullable().optional(),
  assignedSubadminId: z.string().nullable().optional(),
  resolutionNotes: z.string().max(2000).optional(),
});
