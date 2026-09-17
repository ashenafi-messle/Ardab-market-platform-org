// ==============================================================================
// Ardab Market - Supplier Request Validators (Zod)
// ==============================================================================

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

export const paymentMethodItemSchema = z
  .object({
    id: z.string().uuid().optional(),
    paymentMethod: z
      .string({ required_error: 'Payment method name is required' })
      .trim()
      .min(2, 'Payment method must be at least 2 characters long')
      .max(100, 'Payment method cannot exceed 100 characters'),
    accountNumber: z
      .string({ required_error: 'Account number is required' })
      .trim()
      .min(3, 'Account number must be at least 3 characters long')
      .max(50, 'Account number cannot exceed 50 characters'),
    isPrimary: z.boolean().optional(),
  })
  .strict();

export const createSupplierSchema = z
  .object({
    companyName: z
      .string({ required_error: 'Business / Enterprise name is required' })
      .trim()
      .min(2, 'Enterprise name must be at least 2 characters long')
      .max(150, 'Enterprise name cannot exceed 150 characters'),
    name: z
      .string({ required_error: 'Contact person name is required' })
      .trim()
      .min(2, 'Contact person name must be at least 2 characters long')
      .max(100, 'Contact person name cannot exceed 100 characters'),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .min(7, 'Phone number must be at least 7 characters long')
      .max(25, 'Phone number cannot exceed 25 characters'),
    email: emailNormalization,
    city: z
      .string({ required_error: 'Operational city hub is required' })
      .trim()
      .min(2, 'City name must be at least 2 characters long')
      .max(100, 'City name cannot exceed 100 characters'),
    category: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    tinNumber: z
      .string()
      .trim()
      .max(50)
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    address: z
      .string({ required_error: 'Business / Warehouse address is required' })
      .trim()
      .min(3, 'Address must be at least 3 characters long')
      .max(255, 'Address cannot exceed 255 characters'),
    status: z
      .enum(['ACTIVE', 'SUSPENDED', 'INACTIVE'], {
        errorMap: () => ({ message: 'Status must be ACTIVE, SUSPENDED, or INACTIVE' }),
      })
      .optional()
      .default('ACTIVE'),
    verificationStatus: z
      .enum(['VERIFIED', 'PENDING', 'REJECTED'], {
        errorMap: () => ({ message: 'Verification status must be VERIFIED, PENDING, or REJECTED' }),
      })
      .optional()
      .default('PENDING'),
    notes: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    paymentMethods: z
      .array(paymentMethodItemSchema, {
        required_error: 'At least one payment method with its account number is required',
        invalid_type_error: 'Payment methods must be a list of payment methods with account numbers',
      })
      .min(1, 'At least one payment method with its account number is required'),
    paymentMethodId: z
      .string()
      .trim()
      .uuid('Invalid payment method ID format (must be a valid UUID)')
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  })
  .strict({
    message: 'Unknown or unauthorized field detected in payload. Legacy fields such as bankAccountNumber are strictly rejected.',
  });

export const updateSupplierSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(2, 'Enterprise name must be at least 2 characters long')
      .max(150, 'Enterprise name cannot exceed 150 characters')
      .optional(),
    name: z
      .string()
      .trim()
      .min(2, 'Contact person name must be at least 2 characters long')
      .max(100, 'Contact person name cannot exceed 100 characters')
      .optional(),
    phone: z
      .string()
      .trim()
      .min(7, 'Phone number must be at least 7 characters long')
      .max(25, 'Phone number cannot exceed 25 characters')
      .optional(),
    email: emailNormalization,
    city: z
      .string()
      .trim()
      .min(2, 'City name must be at least 2 characters long')
      .max(100, 'City name cannot exceed 100 characters')
      .optional(),
    category: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable()
      .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
    tinNumber: z
      .string()
      .trim()
      .max(50)
      .optional()
      .nullable()
      .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
    address: z
      .string()
      .trim()
      .min(3, 'Address must be at least 3 characters long')
      .max(255, 'Address cannot exceed 255 characters')
      .optional(),
    status: z
      .enum(['ACTIVE', 'SUSPENDED', 'INACTIVE'], {
        errorMap: () => ({ message: 'Status must be ACTIVE, SUSPENDED, or INACTIVE' }),
      })
      .optional(),
    verificationStatus: z
      .enum(['VERIFIED', 'PENDING', 'REJECTED'], {
        errorMap: () => ({ message: 'Verification status must be VERIFIED, PENDING, or REJECTED' }),
      })
      .optional(),
    notes: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
    paymentMethods: z
      .array(paymentMethodItemSchema)
      .min(1, 'At least one payment method is required when updating payment methods')
      .optional(),
    paymentMethodId: z
      .string()
      .trim()
      .uuid('Invalid payment method ID format (must be a valid UUID)')
      .optional()
      .nullable()
      .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
  })
  .strict({
    message: 'Unknown or unauthorized field detected in payload. Legacy fields such as bankAccountNumber are strictly rejected.',
  });

export const updateSupplierStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE'], {
      errorMap: () => ({ message: 'Status must be ACTIVE, SUSPENDED, or INACTIVE' }),
    }),
  })
  .strict();

export const supplierParamsSchema = z.object({
  id: z.string().uuid('Invalid supplier ID format'),
});
