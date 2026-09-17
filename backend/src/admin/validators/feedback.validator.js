// ==============================================================================
// Ardab Market - Feedback & Reputation Request Validators (Zod)
// ==============================================================================

import { z } from 'zod';

const FEEDBACK_TYPE_VALUES = ['PRODUCT', 'DELIVERY', 'PLATFORM', 'SUPPLIER', 'ORDER', 'CUSTOMER_SERVICE'];
const FEEDBACK_STATUS_VALUES = [
  'NEW',
  'PENDING',
  'PUBLISHED',
  'UNDER_REVIEW',
  'REVIEWED',
  'RESOLVED',
  'FLAGGED',
  'HIDDEN',
  'REJECTED',
  'ARCHIVED',
];
const FEEDBACK_VISIBILITY_VALUES = ['PUBLIC', 'PRIVATE', 'HIDDEN'];
const FEEDBACK_SOURCE_VALUES = ['ORDER', 'PRODUCT', 'SELLER', 'DELIVERY', 'SUPPORT', 'PLATFORM'];
const FEEDBACK_MODERATION_ACTIONS = ['PUBLISH', 'HIDE', 'REJECT', 'RESOLVE', 'ARCHIVE', 'RESTORE'];
const FEEDBACK_REPORT_REASONS = [
  'SPAM',
  'ABUSIVE_LANGUAGE',
  'HARASSMENT',
  'FALSE_INFORMATION',
  'INAPPROPRIATE_CONTENT',
  'DUPLICATE',
  'OTHER',
];

export const feedbackIdParamSchema = z.object({
  id: z.string().min(1, 'Feedback ID is required'),
});

export const reportIdParamSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
});

export const listFeedbackQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  status: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || FEEDBACK_STATUS_VALUES.includes(val), {
      message: `Status must be one of: ALL, ${FEEDBACK_STATUS_VALUES.join(', ')}`,
    }),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  category: z.string().optional(),
  type: z
    .string()
    .optional()
    .refine((val) => !val || val === 'ALL' || FEEDBACK_TYPE_VALUES.includes(val), {
      message: `Type must be one of: ALL, ${FEEDBACK_TYPE_VALUES.join(', ')}`,
    }),
  source: z.string().optional(),
  verified: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  city: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'rating', 'status', 'publishedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createFeedbackSchema = z.object({
  customerId: z.string().optional(),
  authorName: z.string().trim().min(2, 'Author name must be at least 2 characters').max(150),
  authorRole: z.enum(['CUSTOMER', 'SUPPLIER', 'MERCHANT']).default('CUSTOMER'),
  orderId: z.string().optional(),
  productId: z.string().optional(),
  sellerId: z.string().optional(),
  deliveryId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(FEEDBACK_TYPE_VALUES).default('PLATFORM'),
  source: z.enum(FEEDBACK_SOURCE_VALUES).default('PLATFORM'),
  city: z.string().default('Gondar'),
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(255),
  comment: z.string().trim().min(3, 'Comment must be at least 3 characters').max(10000),
  targetEntityName: z.string().max(200).optional(),
  isAnonymous: z.boolean().default(false),
});

export const respondFeedbackSchema = z.object({
  body: z.string().trim().min(1, 'Response body cannot be empty').max(10000),
  responderType: z.enum(['SUBADMIN', 'ADMIN', 'SELLER', 'SYSTEM']).default('SUBADMIN'),
});

export const moderateFeedbackSchema = z.object({
  action: z.enum(FEEDBACK_MODERATION_ACTIONS, {
    errorMap: () => ({ message: `Action must be one of: ${FEEDBACK_MODERATION_ACTIONS.join(', ')}` }),
  }),
  reason: z.string().trim().max(1000).optional(),
});

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(FEEDBACK_STATUS_VALUES),
  reason: z.string().trim().max(1000).optional(),
});

export const updateFeedbackSchema = z.object({
  status: z.enum(FEEDBACK_STATUS_VALUES).optional(),
  visibility: z.enum(FEEDBACK_VISIBILITY_VALUES).optional(),
  categoryId: z.string().optional(),
  reason: z.string().trim().max(1000).optional(),
});

export const createFeedbackReportSchema = z.object({
  reason: z.enum(FEEDBACK_REPORT_REASONS),
  description: z.string().trim().max(2000).optional(),
  reportedBy: z.string().trim().max(150).optional(),
  reporterEmail: z.string().email().optional(),
});

export const reviewReportSchema = z.object({
  action: z.enum(['DISMISS', 'TAKE_ACTION']),
  actionTaken: z.string().trim().max(1000).optional(),
});
