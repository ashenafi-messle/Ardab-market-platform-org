// ==============================================================================
// Ardab Market - Product Request Validators (Zod)
// ==============================================================================

import { z } from 'zod';

const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'ARCHIVED'];

const numericPreprocess = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  return isNaN(num) ? val : num;
};

export const createProductSchema = z
  .object({
    name: z
      .string({ required_error: 'Product name is required' })
      .trim()
      .min(2, 'Product name must be at least 2 characters long')
      .max(200, 'Product name cannot exceed 200 characters'),
    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    sellerId: z
      .string({ required_error: 'Product owner / seller ID is required' })
      .uuid('Invalid seller / product owner ID format'),
    marketplaceCategoryId: z
      .string({ required_error: 'Marketplace category ID is required' })
      .uuid('Invalid marketplace category ID format'),
    unit: z
      .string({ required_error: 'Commodity unit is required (e.g. kg, bag, quintal, liter, piece)' })
      .trim()
      .min(1, 'Unit must not be empty')
      .max(50, 'Unit string cannot exceed 50 characters'),
    weight: z.preprocess(
      numericPreprocess,
      z
        .number({ required_error: 'Product weight in KG is required' })
        .positive('Product weight must be greater than 0')
    ),
    costPrice: z.preprocess(
      numericPreprocess,
      z
        .number()
        .min(0, 'Cost price cannot be negative')
        .optional()
        .nullable()
    ),
    sellingPrice: z.preprocess(
      numericPreprocess,
      z
        .number({ required_error: 'Marketplace selling price is required' })
        .min(0, 'Selling price cannot be negative')
    ),
    images: z
      .array(z.string().trim())
      .optional()
      .default([]),
    cityAvailability: z.preprocess(
      (val) => (typeof val === 'string' ? val.split(',').map((s) => s.trim()) : val),
      z.array(z.string().trim()).optional().default(['All Cities'])
    ),
    status: z
      .enum(PRODUCT_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${PRODUCT_STATUSES.join(', ')}` }),
      })
      .optional()
      .default('ACTIVE'),
    itemCode: z.any().optional(),
    packagingUnit: z.any().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.itemCode !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Item code is auto-generated server-side and cannot be supplied by the client',
        path: ['itemCode'],
      });
    }
    if (data.packagingUnit !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Packaging Unit has been removed from the product specification. Please use standard unit.',
        path: ['packagingUnit'],
      });
    }
  });

export const updateProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Product name must be at least 2 characters long')
      .max(200, 'Product name cannot exceed 200 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
    sellerId: z
      .string()
      .uuid('Invalid seller / product owner ID format')
      .optional(),
    marketplaceCategoryId: z
      .string()
      .uuid('Invalid marketplace category ID format')
      .optional(),
    unit: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .optional(),
    weight: z.preprocess(
      numericPreprocess,
      z
        .number()
        .positive('Product weight must be greater than 0')
        .optional()
    ),
    costPrice: z.preprocess(
      numericPreprocess,
      z
        .number()
        .min(0, 'Cost price cannot be negative')
        .optional()
        .nullable()
    ),
    sellingPrice: z.preprocess(
      numericPreprocess,
      z
        .number()
        .min(0, 'Selling price cannot be negative')
        .optional()
    ),
    images: z
      .array(z.string().trim())
      .optional(),
    cityAvailability: z.preprocess(
      (val) => (typeof val === 'string' ? val.split(',').map((s) => s.trim()) : val),
      z.array(z.string().trim()).optional()
    ),
    status: z
      .enum(PRODUCT_STATUSES)
      .optional(),
    itemCode: z.any().optional(),
    packagingUnit: z.any().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.itemCode !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Item code is immutable and cannot be modified',
        path: ['itemCode'],
      });
    }
    if (data.packagingUnit !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Packaging Unit has been removed from the product specification. Please use standard unit.',
        path: ['packagingUnit'],
      });
    }
  });

export const updateProductStatusSchema = z.object({
  status: z.enum(PRODUCT_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${PRODUCT_STATUSES.join(', ')}` }),
  }),
});

export const productParamsSchema = z.object({
  id: z.string().uuid('Invalid product ID format'),
});

export const productImageParamsSchema = z.object({
  id: z.string().uuid('Invalid product ID format'),
  imageId: z.string().uuid('Invalid image ID format'),
});

export const updateProductImageSchema = z.object({
  isPrimary: z.boolean().optional(),
  sortOrder: z.preprocess(numericPreprocess, z.number().int().min(0).optional()),
});

export const reorderProductImagesSchema = z.object({
  imageIds: z.array(z.string().uuid('Invalid image ID in order list')).min(1, 'At least one image ID required'),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(25),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  sellerId: z.string().uuid('Invalid seller filter ID').optional(),
  categoryId: z.string().uuid('Invalid category filter ID').optional(),
  status: z.string().trim().optional(),
  city: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'name', 'sellingPrice', 'itemCode']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

