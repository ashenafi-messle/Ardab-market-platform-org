// ==============================================================================
// Ardab Market - Order Module Request Validators (Zod Schemas)
// ==============================================================================

import { z } from 'zod';

const ORDER_STATUS_ENUM = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_DELIVERY',
  'ASSIGNED_TO_TRIP',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'FAILED',
  'RETURNED',
  'REJECTED',
];

const PAYMENT_STATUS_ENUM = ['PAID', 'PENDING', 'FAILED', 'REFUNDED'];

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  deliveryZone: z.string().trim().optional(),
  status: z.enum(['ALL', ...ORDER_STATUS_ENUM]).optional(),
  paymentStatus: z.enum(['ALL', ...PAYMENT_STATUS_ENUM]).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortBy: z
    .enum(['orderNumber', 'placedAt', 'createdAt', 'totalAmount', 'totalWeight', 'status'])
    .default('placedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const orderStatusUpdateSchema = z
  .object({
    status: z.enum(ORDER_STATUS_ENUM, {
      errorMap: () => ({ message: 'Invalid order status value' }),
    }),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) => {
      if ((data.status === 'CANCELLED' || data.status === 'REJECTED') && (!data.reason || data.reason.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'A cancellation or rejection reason is required.',
      path: ['reason'],
    }
  );

export const orderCancelSchema = z.object({
  reason: z.string().trim().min(3, 'Cancellation reason must be at least 3 characters').max(500),
});

export const orderRejectSchema = z.object({
  reason: z.string().trim().min(3, 'Rejection reason must be at least 3 characters').max(500),
});

export const bulkOrderStatusSchema = z.object({
  ids: z.array(z.string().uuid('Invalid order ID in selection')).min(1, 'At least one order must be selected'),
  status: z.enum(ORDER_STATUS_ENUM, {
    errorMap: () => ({ message: 'Invalid order status value' }),
  }),
  reason: z.string().trim().max(500).optional(),
});

export const customerCheckoutSchema = z.object({
  customerId: z.string().uuid().optional(), // For admin/direct checkout if needed
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product ID'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .min(1, 'Order must contain at least one product item'),
  deliveryAddress: z.object({
    recipientName: z.string().trim().min(2, 'Recipient name is required'),
    phone: z.string().trim().min(9, 'Valid phone number is required'),
    city: z.string().trim().min(2, 'City is required'),
    deliveryZone: z.string().trim().optional(),
    neighborhood: z.string().trim().optional(),
    addressLine: z.string().trim().min(3, 'Address line is required'),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
  }),
  paymentMethod: z.string().trim().default('CASH_ON_DELIVERY'),
  customerNote: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().max(128).optional(),
});
