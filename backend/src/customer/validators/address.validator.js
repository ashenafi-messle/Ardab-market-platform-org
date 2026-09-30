// ==============================================================================
// Ardab Market - Customer Address Validators (Zod Schemas)
// ==============================================================================

import { z } from 'zod';

export const addressIdParamSchema = z.object({
  addressId: z.string().min(1, 'Address ID is required'),
});

export const createAddressSchema = z.object({
  label: z.string().trim().max(50).default('Home'),
  // Support both recipientName and fullName for seamless client interop
  recipientName: z.string().trim().min(2, 'Recipient name must be at least 2 characters').max(100).optional(),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
  phone: z.string().trim().min(9, 'Phone number must be at least 9 digits').max(20, 'Phone number cannot exceed 20 characters'),
  city: z.string().trim().min(2, 'City is required').max(100),
  // Support deliveryZone, subcity, neighborhood, streetAddress
  deliveryZone: z.string().trim().max(100).optional().nullable(),
  subcity: z.string().trim().max(100).optional().nullable(),
  neighborhood: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  addressLine: z.string().trim().min(3, 'Address line must be at least 3 characters').max(255).optional(),
  specificAddress: z.string().trim().min(3, 'Specific address must be at least 3 characters').max(255).optional(),
  streetAddress: z.string().trim().max(255).optional().nullable(),
  building: z.string().trim().max(100).optional().nullable(),
  additionalInfo: z.string().trim().max(500).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  isDefault: z.boolean().default(false),
}).refine((data) => data.recipientName || data.fullName, {
  message: 'Recipient name or full name is required',
  path: ['recipientName'],
}).refine((data) => data.addressLine || data.specificAddress || data.streetAddress, {
  message: 'Address line or specific address is required',
  path: ['addressLine'],
});

export const updateAddressSchema = z.object({
  label: z.string().trim().max(50).optional(),
  recipientName: z.string().trim().min(2).max(100).optional(),
  fullName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(9).max(20).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  deliveryZone: z.string().trim().max(100).optional().nullable(),
  subcity: z.string().trim().max(100).optional().nullable(),
  neighborhood: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  addressLine: z.string().trim().min(3).max(255).optional(),
  specificAddress: z.string().trim().min(3).max(255).optional(),
  streetAddress: z.string().trim().max(255).optional().nullable(),
  building: z.string().trim().max(100).optional().nullable(),
  additionalInfo: z.string().trim().max(500).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  isDefault: z.boolean().optional(),
});
