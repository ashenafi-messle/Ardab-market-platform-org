// ==============================================================================
// Ardab Market - Marketplace Category Request Validators (Zod)
// ==============================================================================

import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters long')
    .max(100, 'Category name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional(),
  icon: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional(),
  icon: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
});

export const categoryParamsSchema = z.object({
  id: z.string().uuid('Invalid category ID format'),
});

export const sellerParamsSchema = z.object({
  sellerId: z.string().uuid('Invalid seller ID format'),
});

export const assignSellerCategorySchema = z.object({
  categoryId: z.string({ required_error: 'Category ID is required' }).uuid('Invalid category ID format'),
});

export const sellerCategoryParamsSchema = z.object({
  sellerId: z.string().uuid('Invalid seller ID format'),
  categoryId: z.string().uuid('Invalid category ID format'),
});
