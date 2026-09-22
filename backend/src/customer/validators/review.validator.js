// ==============================================================================
// Ardab Market - Customer Review Validators (Zod Schemas)
// ==============================================================================

import { z } from 'zod';

export const productIdParamSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export const reviewIdParamSchema = z.object({
  id: z.string().min(1, 'Review ID is required'),
});

export const createProductReviewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required').optional(),
  rating: z
    .coerce
    .number({ required_error: 'Rating is required' })
    .int('Rating must be an integer between 1 and 5')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  comment: z
    .string({ required_error: 'Review comment is required' })
    .trim()
    .min(3, 'Review comment must be at least 3 characters')
    .max(2000, 'Review comment cannot exceed 2000 characters'),
  title: z
    .string()
    .trim()
    .max(120, 'Review title cannot exceed 120 characters')
    .optional(),
  isAnonymous: z.boolean().optional().default(false),
});

export const updateCustomerReviewSchema = z.object({
  rating: z
    .coerce
    .number()
    .int('Rating must be an integer between 1 and 5')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
  comment: z
    .string()
    .trim()
    .min(3, 'Review comment must be at least 3 characters')
    .max(2000, 'Review comment cannot exceed 2000 characters')
    .optional(),
  title: z
    .string()
    .trim()
    .max(120, 'Review title cannot exceed 120 characters')
    .optional(),
  isAnonymous: z.boolean().optional(),
});

export const productReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.enum(['newest', 'oldest', 'highest', 'lowest']).default('newest'),
});

export const customerReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(['ALL', 'PENDING', 'PUBLISHED', 'REJECTED', 'HIDDEN']).default('ALL'),
});
