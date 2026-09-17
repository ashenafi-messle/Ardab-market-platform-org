// ==============================================================================
// Ardab Market - Customer Request Validators (Zod)
// ==============================================================================
// Strictly protects system-generated customer experience metrics against mass-assignment.
// Enforces strong type validation, sanitization, and parameter whitelisting.

import { z } from 'zod';

const emailNormalization = z
  .string()
  .trim()
  .max(255)
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || val.trim().length === 0) return null;
    return val.trim().toLowerCase();
  })
  .refine((val) => {
    if (val === null) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }, {
    message: 'Please provide a valid email address or leave it empty',
  });

export const customerParamsSchema = z
  .object({
    id: z.string({ required_error: 'Customer ID is required' }).uuid('Invalid customer UUID format'),
  })
  .strict();

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ALL', 'ACTIVE', 'SUSPENDED', 'INACTIVE']).default('ALL'),
  verificationStatus: z.enum(['ALL', 'PENDING', 'VERIFIED', 'REJECTED']).default('ALL'),
  city: z.string().trim().max(100).optional(),
  deliveryZone: z.string().trim().max(100).optional(),
  sortBy: z.enum(['createdAt', 'fullName', 'customerCode', 'lastActivityAt', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).default('desc'),
});

/**
 * Super Admin Profile Update Schema
 * Explicit field whitelisting:
 * System metrics (totalOrders, totalSpent, totalScore) are strictly rejected and protected.
 */
export const updateCustomerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters')
      .optional(),
    phone: z
      .string()
      .trim()
      .min(7, 'Phone number must be at least 7 characters')
      .max(25, 'Phone number cannot exceed 25 characters')
      .optional(),
    email: emailNormalization,
    city: z
      .string()
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(100, 'City cannot exceed 100 characters')
      .optional(),
    deliveryZone: z.string().trim().max(100).optional().nullable(),
    profileImageUrl: z.string().url('Invalid image URL').max(500).optional().nullable(),
    verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
    // Explicitly reject manual metric overrides
    totalOrders: z.never({ message: 'totalOrders is a system-generated metric and cannot be manually modified.' }).optional(),
    totalSpent: z.never({ message: 'totalSpent is a system-generated metric and cannot be manually modified.' }).optional(),
    totalScore: z.never({ message: 'totalScore is a system-generated metric and cannot be manually modified.' }).optional(),
  })
  .strict();

export const updateCustomerStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE'], {
      required_error: 'Valid customer status (ACTIVE, SUSPENDED, INACTIVE) is required',
    }),
  })
  .strict();

export const bulkUpdateCustomerStatusSchema = z
  .object({
    ids: z
      .array(z.string().uuid('Each customer ID must be a valid UUID'))
      .min(1, 'At least one customer ID must be specified'),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE'], {
      required_error: 'Valid target status is required',
    }),
  })
  .strict();

export const customerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().trim().optional(),
});

export const customerActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Mobile Registration Schema
 */
export const customerRegistrationSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .min(7, 'Phone number must be at least 7 characters')
      .max(25, 'Phone number cannot exceed 25 characters'),
    email: emailNormalization,
    password: z.string().min(6, 'Password must be at least 6 characters').max(100).optional(),
    city: z.string().trim().min(2).max(100).default('Gondar'),
    deliveryZone: z.string().trim().max(100).optional(),
  })
  .strict();
