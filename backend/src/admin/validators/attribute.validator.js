// ==============================================================================
// Ardab Market - Attribute Definitions & Category Attributes Validators (Zod)
// ==============================================================================

import { z } from 'zod';

const ATTRIBUTE_TYPES = ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE'];
const ATTRIBUTE_STATUSES = ['ACTIVE', 'INACTIVE', 'DEPRECATED'];
const LOGISTICS_MODES = ['NOT_USED', 'OPTIONAL', 'REQUIRED'];

export const attributeOptionSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, 'Option label is required').max(100),
  value: z.string().trim().min(1, 'Option value is required').max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.enum(ATTRIBUTE_STATUSES).optional(),
});

export const createAttributeSchema = z.object({
  name: z.string().trim().min(2, 'Attribute name must be at least 2 characters').max(100),
  slug: z.string().trim().max(100).optional(),
  type: z.enum(ATTRIBUTE_TYPES, {
    errorMap: () => ({ message: `Attribute type must be one of: ${ATTRIBUTE_TYPES.join(', ')}` }),
  }),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(ATTRIBUTE_STATUSES).optional().default('ACTIVE'),
  unit: z.string().trim().max(30).optional().nullable(),
  validationRules: z.record(z.any()).optional().nullable(),
  options: z.array(z.union([z.string().trim().min(1), attributeOptionSchema])).optional().default([]),
});

export const updateAttributeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(ATTRIBUTE_STATUSES).optional(),
  unit: z.string().trim().max(30).optional().nullable(),
  validationRules: z.record(z.any()).optional().nullable(),
  options: z.array(z.union([z.string().trim().min(1), attributeOptionSchema])).optional(),
});

export const categoryAttributeItemSchema = z.object({
  attributeDefinitionId: z.string().uuid('Invalid attribute definition ID format'),
  isRequired: z.boolean().optional().default(false),
  isVisible: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
  configuration: z.record(z.any()).optional().nullable(),
});

export const updateCategoryAttributesSchema = z.object({
  attributes: z.array(categoryAttributeItemSchema).optional(),
  logistics: z
    .object({
      weightMode: z.enum(LOGISTICS_MODES).optional().default('NOT_USED'),
      unitOfMeasureMode: z.enum(LOGISTICS_MODES).optional().default('NOT_USED'),
      defaultUnit: z.string().trim().max(50).optional().nullable(),
    })
    .optional(),
});
