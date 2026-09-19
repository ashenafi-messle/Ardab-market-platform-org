// ==============================================================================
// Ardab Market - Reusable Attribute Definition Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Audit log helper for attribute operations
 */
async function recordAttributeAuditLog({ adminUser, action, attributeId, ipAddress, changesSummary }) {
  try {
    let validAdminId = null;
    if (adminUser?.id) {
      const exists = await prisma.adminUser.findUnique({ where: { id: adminUser.id }, select: { id: true } });
      if (exists) validAdminId = exists.id;
    }
    await prisma.auditLog.create({
      data: {
        adminId: validAdminId,
        adminEmail: adminUser?.email || 'system@ardabmarket.com',
        action,
        entity: 'AttributeDefinition',
        entityId: attributeId,
        ipAddress: ipAddress || null,
        changesSummary: changesSummary || null,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to create audit log for attribute operation', { error: err.message, action });
  }
}

/**
 * Auto slug generator from name
 */
export function generateAttributeSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * List all attribute definitions with search & filters
 */
export async function listAttributes(query = {}) {
  const where = {};

  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  if (query.type && query.type !== 'ALL') {
    where.type = query.type;
  }

  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { slug: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
    ];
  }

  const attributes = await prisma.attributeDefinition.findMany({
    where,
    include: {
      options: {
        where: { status: 'ACTIVE' },
        orderBy: { sortOrder: 'asc' },
      },
      _count: {
        select: {
          categoryAttributes: true,
          productAttributeValues: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return attributes.map((attr) => ({
    id: attr.id,
    name: attr.name,
    slug: attr.slug,
    type: attr.type,
    description: attr.description,
    status: attr.status,
    isSystem: attr.isSystem,
    unit: attr.unit,
    validationRules: attr.validationRules,
    options: attr.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      value: opt.value,
      sortOrder: opt.sortOrder,
      status: opt.status,
    })),
    categoriesCount: attr._count.categoryAttributes,
    productsCount: attr._count.productAttributeValues,
    createdAt: attr.createdAt,
    updatedAt: attr.updatedAt,
  }));
}

/**
 * Get attribute definition by ID or Slug
 */
export async function getAttributeById(idOrSlug) {
  const attribute = await prisma.attributeDefinition.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
      },
      _count: {
        select: {
          categoryAttributes: true,
          productAttributeValues: true,
        },
      },
    },
  });

  if (!attribute) {
    throw ApiError.notFound('Attribute definition not found', 'ATTRIBUTE_NOT_FOUND');
  }

  return {
    id: attribute.id,
    name: attribute.name,
    slug: attribute.slug,
    type: attribute.type,
    description: attribute.description,
    status: attribute.status,
    isSystem: attribute.isSystem,
    unit: attribute.unit,
    validationRules: attribute.validationRules,
    options: attribute.options,
    categoriesCount: attribute._count.categoryAttributes,
    productsCount: attribute._count.productAttributeValues,
    createdAt: attribute.createdAt,
    updatedAt: attribute.updatedAt,
  };
}

/**
 * Create a new reusable attribute definition with predefined options
 */
export async function createAttribute(payload, adminUser = null, ipAddress = null) {
  const name = payload.name?.trim();
  if (!name) {
    throw ApiError.badRequest('Attribute name is required', 'MISSING_ATTRIBUTE_NAME');
  }

  const slug = payload.slug ? generateAttributeSlug(payload.slug) : generateAttributeSlug(name);
  if (!slug) {
    throw ApiError.badRequest('Valid slug could not be generated from attribute name', 'INVALID_SLUG');
  }

  // Check unique slug
  const existing = await prisma.attributeDefinition.findUnique({
    where: { slug },
  });
  if (existing) {
    throw ApiError.conflict(
      `An attribute with slug '${slug}' already exists ('${existing.name}'). Reuse the existing attribute.`,
      'DUPLICATE_ATTRIBUTE_SLUG'
    );
  }

  const type = payload.type;
  if (!['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE'].includes(type)) {
    throw ApiError.badRequest(`Unsupported attribute type: ${type}`, 'INVALID_ATTRIBUTE_TYPE');
  }

  // Normalize options for SELECT/MULTI_SELECT
  const optionsToCreate = [];
  if (['SELECT', 'MULTI_SELECT'].includes(type) && Array.isArray(payload.options)) {
    payload.options.forEach((opt, idx) => {
      const label = typeof opt === 'string' ? opt.trim() : opt.label?.trim();
      const value = typeof opt === 'string' ? generateAttributeSlug(opt) : (opt.value || generateAttributeSlug(label));
      if (label && value) {
        optionsToCreate.push({
          label,
          value,
          sortOrder: typeof opt === 'object' && opt.sortOrder !== undefined ? opt.sortOrder : idx,
          status: 'ACTIVE',
        });
      }
    });
  }

  const created = await prisma.attributeDefinition.create({
    data: {
      name,
      slug,
      type,
      description: payload.description?.trim() || null,
      status: payload.status || 'ACTIVE',
      isSystem: payload.isSystem || false,
      unit: payload.unit?.trim() || null,
      validationRules: payload.validationRules || null,
      options: optionsToCreate.length > 0 ? { create: optionsToCreate } : undefined,
    },
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  await recordAttributeAuditLog({
    adminUser,
    action: 'ATTRIBUTE_CREATED',
    attributeId: created.id,
    ipAddress,
    changesSummary: `Created attribute '${created.name}' (${created.type}) with ${created.options.length} options`,
  });

  return created;
}

/**
 * Update an attribute definition, preserving historical options
 */
export async function updateAttribute(id, payload, adminUser = null, ipAddress = null) {
  const existing = await prisma.attributeDefinition.findUnique({
    where: { id },
    include: { options: true },
  });

  if (!existing) {
    throw ApiError.notFound('Attribute definition not found', 'ATTRIBUTE_NOT_FOUND');
  }

  const dataToUpdate = {};
  if (payload.name !== undefined) dataToUpdate.name = payload.name.trim();
  if (payload.description !== undefined) dataToUpdate.description = payload.description ? payload.description.trim() : null;
  if (payload.status !== undefined) dataToUpdate.status = payload.status;
  if (payload.unit !== undefined) dataToUpdate.unit = payload.unit ? payload.unit.trim() : null;
  if (payload.validationRules !== undefined) dataToUpdate.validationRules = payload.validationRules;

  // Option updates if provided for SELECT/MULTI_SELECT
  if (Array.isArray(payload.options) && ['SELECT', 'MULTI_SELECT'].includes(existing.type)) {
    // Process new, updated, and existing options
    for (let i = 0; i < payload.options.length; i++) {
      const opt = payload.options[i];
      const label = typeof opt === 'string' ? opt.trim() : opt.label?.trim();
      const value = typeof opt === 'string' ? generateAttributeSlug(opt) : (opt.value || generateAttributeSlug(label));

      if (!label || !value) continue;

      const matched = existing.options.find((o) => o.value === value || (opt.id && o.id === opt.id));
      if (matched) {
        await prisma.attributeOption.update({
          where: { id: matched.id },
          data: {
            label,
            sortOrder: typeof opt === 'object' && opt.sortOrder !== undefined ? opt.sortOrder : i,
            status: typeof opt === 'object' && opt.status ? opt.status : 'ACTIVE',
          },
        });
      } else {
        await prisma.attributeOption.create({
          data: {
            attributeDefinitionId: existing.id,
            label,
            value,
            sortOrder: typeof opt === 'object' && opt.sortOrder !== undefined ? opt.sortOrder : i,
            status: 'ACTIVE',
          },
        });
      }
    }
  }

  const updated = await prisma.attributeDefinition.update({
    where: { id },
    data: dataToUpdate,
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  await recordAttributeAuditLog({
    adminUser,
    action: 'ATTRIBUTE_UPDATED',
    attributeId: updated.id,
    ipAddress,
    changesSummary: `Updated attribute '${updated.name}'`,
  });

  return updated;
}

/**
 * Safely deactivate an attribute (never physical delete if in use)
 */
export async function deactivateAttribute(id, adminUser = null, ipAddress = null) {
  const existing = await prisma.attributeDefinition.findUnique({
    where: { id },
    include: {
      _count: {
        select: { productAttributeValues: true },
      },
    },
  });

  if (!existing) {
    throw ApiError.notFound('Attribute definition not found', 'ATTRIBUTE_NOT_FOUND');
  }

  // Deactivate
  const updated = await prisma.attributeDefinition.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });

  await recordAttributeAuditLog({
    adminUser,
    action: 'ATTRIBUTE_DEACTIVATED',
    attributeId: id,
    ipAddress,
    changesSummary: `Deactivated attribute '${existing.name}' (used in ${existing._count.productAttributeValues} products)`,
  });

  return updated;
}
