// ==============================================================================
// Ardab Market - Agent & Integration Request Validators
// ==============================================================================

import { z } from 'zod';

export const phoneRegex = /^(\+251[1-9]\d{8}|0[97]\d{8}|011\d{7})$/;

export const createAgentSchema = z.object({
  name: z.string().trim().min(2, 'Full legal name must be at least 2 characters').max(120),
  phone: z.string().trim().regex(phoneRegex, 'Please enter a valid Ethiopian phone number (e.g. +251911234567 or 0911234567)'),
  email: z.string().trim().email('Invalid email address').max(150),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  commissionRate: z.coerce.number().min(0, 'Commission rate must be non-negative').max(100, 'Commission rate cannot exceed 100%').optional().default(5.00),
  commissionType: z.enum(['PERCENTAGE', 'FIXED']).optional().default('PERCENTAGE'),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updateAgentSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().regex(phoneRegex, 'Please enter a valid Ethiopian phone number').optional(),
  email: z.string().trim().email().max(150).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  commissionType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const customerIntegrationRequestSchema = z.object({
  agentEmail: z.string().trim().email('Please enter a valid agent email address'),
});

export const reviewRequestSchema = z.object({
  rejectionReason: z.string().trim().max(500).optional().nullable(),
});
