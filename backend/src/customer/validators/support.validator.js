// ==============================================================================
// Ardab Market - Customer Support Request Validators (Zod Schemas)
// ==============================================================================

import { z } from 'zod';

const SUPPORT_TICKET_STATUSES = [
  'ALL',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_CUSTOMER',
  'RESOLVED',
  'CLOSED',
];

const SUPPORT_TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export const requestIdParamSchema = z.object({
  requestId: z.string().min(1, 'Support request ID is required'),
});

export const customerSupportQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().optional(),
  status: z
    .string()
    .optional()
    .refine((val) => !val || SUPPORT_TICKET_STATUSES.includes(val), {
      message: `Status must be one of: ${SUPPORT_TICKET_STATUSES.join(', ')}`,
    }),
});

export const createCustomerRequestSchema = z.object({
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject cannot exceed 200 characters'),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(2, 'Message must be at least 2 characters')
    .max(5000, 'Message cannot exceed 5000 characters'),
  categoryId: z.string().trim().optional().nullable(),
  orderId: z.string().trim().optional().nullable(),
  priority: z.enum(SUPPORT_TICKET_PRIORITIES).default('NORMAL'),
});

export const replyCustomerMessageSchema = z.object({
  message: z
    .string({ required_error: 'Reply message cannot be empty' })
    .trim()
    .min(1, 'Message must be at least 1 character')
    .max(5000, 'Message cannot exceed 5000 characters'),
  idempotencyKey: z.string().max(64).optional().nullable(),
});
