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
  parentId: z
    .string()
    .uuid('Invalid parent category ID format')
    .optional()
    .nullable(),
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
  imageUrl: z
    .string()
    .url('Invalid image URL format')
    .optional()
    .nullable(),
  sortOrder: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0),
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
  parentId: z
    .string()
    .uuid('Invalid parent category ID format')
    .optional()
    .nullable(),
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
  imageUrl: z
    .string()
    .url('Invalid image URL format')
    .optional()
    .nullable(),
  sortOrder: z
    .number()
    .int()
    .min(0)
    .optional(),
  isActive: z.boolean().optional(),
});

export const updateCategoryStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive boolean flag is required' }),
});

export const moveCategorySchema = z.object({
  targetParentId: z
    .string()
    .uuid('Invalid target parent category ID format')
    .optional()
    .nullable(),
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

