// ==============================================================================
// Ardab Market - Payment Method Request Validators (Zod)
// ==============================================================================

import { z } from 'zod';

export const createPaymentMethodSchema = z.object({
  name: z
    .string({ required_error: 'Payment method name is required' })
    .trim()
    .min(2, 'Payment method name must be at least 2 characters long')
    .max(100, 'Payment method name cannot exceed 100 characters'),
  provider: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  accountName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  accountNumber: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  isActive: z.boolean().optional().default(true),
});

export const updatePaymentMethodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Payment method name must be at least 2 characters long')
    .max(100, 'Payment method name cannot exceed 100 characters')
    .optional(),
  provider: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
  accountName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
  accountNumber: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
  isActive: z.boolean().optional(),
});

export const updatePaymentMethodStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive is required' }),
});

export const paymentMethodParamsSchema = z.object({
  id: z.string().uuid('Invalid payment method ID format'),
});
