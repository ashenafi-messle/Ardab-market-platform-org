// ==============================================================================
// Ardab Market - Category Attribute & Logistics Resolution Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { getCategoryPath } from './category.service.js';

/**
 * Record audit log for category attribute mutations
 */
async function recordCategoryAttrAuditLog({ adminUser, action, categoryId, ipAddress, changesSummary }) {
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
        entity: 'CategoryAttribute',
        entityId: categoryId,
        ipAddress: ipAddress || null,
        changesSummary: changesSummary || null,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to record audit log for category attribute mutation', { error: err.message });
  }
}

/**
 * Get local attributes and local logistics configuration configured directly on a category
 */
export async function getCategoryLocalAttributes(categoryId) {
  const category = await prisma.marketplaceCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  if (!category) {
    throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  }

  const [attributes, logisticsConfig] = await Promise.all([
    prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: {
        attributeDefinition: {
          include: {
            options: {
              where: { status: 'ACTIVE' },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.categoryLogisticsConfig.findUnique({
      where: { categoryId },
    }),
  ]);

  return {
    categoryId: category.id,
    categoryName: category.name,
    attributes: attributes.map((ca) => ({
      id: ca.id,
      attributeDefinitionId: ca.attributeDefinitionId,
      name: ca.attributeDefinition.name,
      slug: ca.attributeDefinition.slug,
      type: ca.attributeDefinition.type,
      description: ca.attributeDefinition.description,
      unit: ca.attributeDefinition.unit,
      isRequired: ca.isRequired,
      isVisible: ca.isVisible,
      sortOrder: ca.sortOrder,
      configuration: ca.configuration,
      options: ca.attributeDefinition.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        value: opt.value,
        sortOrder: opt.sortOrder,
      })),
    })),
    logistics: logisticsConfig
      ? {
          weightMode: logisticsConfig.weightMode,
          unitOfMeasureMode: logisticsConfig.unitOfMeasureMode,
          defaultUnit: logisticsConfig.defaultUnit,
        }
      : {
          weightMode: 'OPTIONAL',
          unitOfMeasureMode: 'OPTIONAL',
          defaultUnit: null,
        },
  };
}

/**
 * Update/replace category local attributes and logistics config
 */
export async function updateCategoryLocalAttributes(categoryId, payload, adminUser = null, ipAddress = null) {
  const category = await prisma.marketplaceCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });

  if (!category) {
    throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  }

  // Use a transaction for atomic synchronization
  await prisma.$transaction(async (tx) => {
    // 1. Update/upsert logistics config if provided
    if (payload.logistics) {
      const { weightMode, unitOfMeasureMode, defaultUnit } = payload.logistics;
      await tx.categoryLogisticsConfig.upsert({
        where: { categoryId },
        create: {
          categoryId,
          weightMode: weightMode || 'NOT_USED',
          unitOfMeasureMode: unitOfMeasureMode || 'NOT_USED',
          defaultUnit: defaultUnit ? defaultUnit.trim() : null,
        },
        update: {
          weightMode: weightMode || 'NOT_USED',
          unitOfMeasureMode: unitOfMeasureMode || 'NOT_USED',
          defaultUnit: defaultUnit ? defaultUnit.trim() : null,
        },
      });
    }

    // 2. Synchronize attributes if provided
    if (Array.isArray(payload.attributes)) {
      // Find currently configured attributes
      const existing = await tx.categoryAttribute.findMany({
        where: { categoryId },
      });
      const incomingDefIds = new Set(payload.attributes.map((a) => a.attributeDefinitionId));

      // Remove attributes no longer included
      const toDelete = existing.filter((e) => !incomingDefIds.has(e.attributeDefinitionId));
      for (const item of toDelete) {
        await tx.categoryAttribute.delete({
          where: { id: item.id },
        });
      }

      // Upsert incoming attributes
      for (let i = 0; i < payload.attributes.length; i++) {
        const item = payload.attributes[i];
        if (!item.attributeDefinitionId) continue;

        // Verify definition exists
        const def = await tx.attributeDefinition.findUnique({
          where: { id: item.attributeDefinitionId },
          select: { id: true },
        });
        if (!def) {
          throw ApiError.badRequest(
            `Attribute definition '${item.attributeDefinitionId}' not found`,
            'INVALID_ATTRIBUTE_DEFINITION'
          );
        }

        await tx.categoryAttribute.upsert({
          where: {
            categoryId_attributeDefinitionId: {
              categoryId,
              attributeDefinitionId: item.attributeDefinitionId,
            },
          },
          create: {
            categoryId,
            attributeDefinitionId: item.attributeDefinitionId,
            isRequired: item.isRequired === true,
            isVisible: item.isVisible !== false,
            sortOrder: item.sortOrder !== undefined ? item.sortOrder : i,
            configuration: item.configuration || null,
          },
          update: {
            isRequired: item.isRequired === true,
            isVisible: item.isVisible !== false,
            sortOrder: item.sortOrder !== undefined ? item.sortOrder : i,
            configuration: item.configuration || null,
          },
        });
      }
    }
  });

  await recordCategoryAttrAuditLog({
    adminUser,
    action: 'CATEGORY_ATTRIBUTE_CONFIGURED',
    categoryId,
    ipAddress,
    changesSummary: `Updated attribute & logistics configuration for category '${category.name}'`,
  });

  return getCategoryLocalAttributes(categoryId);
}

/**
 * Resolve effective category attributes with multi-level inheritance
 * Walks ancestry path (Root -> ... -> Child -> Leaf Category):
 * - Collects inherited attributes
 * - Applies overrides from lower levels
 * - Resolves effective logistics configuration
 */
export async function resolveEffectiveCategoryAttributes(categoryId) {
  const category = await prisma.marketplaceCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  if (!category) {
    throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  }

  // Get ancestry path ordered from Root to Target Category
  const ancestry = await getCategoryPath(categoryId);
  const ancestorIds = ancestry.map((a) => a.id);

  // Batch query all CategoryAttribute records for all ancestors in path
  const allCategoryAttributes = await prisma.categoryAttribute.findMany({
    where: {
      categoryId: { in: ancestorIds },
    },
    include: {
      attributeDefinition: {
        include: {
          options: {
            where: { status: 'ACTIVE' },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Batch query all logistics configs along the path
  const allLogisticsConfigs = await prisma.categoryLogisticsConfig.findMany({
    where: {
      categoryId: { in: ancestorIds },
    },
  });
  const logisticsConfigMap = new Map(allLogisticsConfigs.map((cfg) => [cfg.categoryId, cfg]));

  // 1. Resolve Logistics Configuration (nearest ancestor with explicit config wins)
  let effectiveWeightMode = 'OPTIONAL';
  let effectiveUnitMode = 'OPTIONAL';
  let effectiveDefaultUnit = null;

  for (let i = ancestorIds.length - 1; i >= 0; i--) {
    const aid = ancestorIds[i];
    const cfg = logisticsConfigMap.get(aid);
    if (cfg) {
      effectiveWeightMode = cfg.weightMode;
      effectiveUnitMode = cfg.unitOfMeasureMode;
      effectiveDefaultUnit = cfg.defaultUnit;
      break; // Nearest ancestor with explicit configuration governs
    }
  }

  // 2. Resolve Attributes Inheritance & Overrides
  // Map keyed by attributeDefinitionId
  const effectiveAttrMap = new Map();

  // Iterate down the path from root to leaf
  for (const ancestor of ancestry) {
    const isTarget = ancestor.id === categoryId;
    const catAttrs = allCategoryAttributes.filter((ca) => ca.categoryId === ancestor.id);

    for (const ca of catAttrs) {
      const def = ca.attributeDefinition;
      if (def.status !== 'ACTIVE') continue;

      if (!effectiveAttrMap.has(def.id)) {
        // First introduction of this attribute in the tree
        effectiveAttrMap.set(def.id, {
          id: def.id,
          attributeDefinitionId: def.id,
          name: def.name,
          slug: def.slug,
          type: def.type,
          description: def.description,
          unit: def.unit,
          validationRules: def.validationRules,
          isRequired: ca.isRequired,
          isVisible: ca.isVisible,
          sortOrder: ca.sortOrder,
          source: isTarget ? 'LOCAL' : 'INHERITED',
          originCategoryId: ancestor.id,
          originCategoryName: ancestor.name,
          options: def.options.map((opt) => ({
            id: opt.id,
            label: opt.label,
            value: opt.value,
            sortOrder: opt.sortOrder,
          })),
        });
      } else {
        // Child category overrides parent settings (e.g. child makes it required or custom sort order)
        const existing = effectiveAttrMap.get(def.id);
        existing.isRequired = ca.isRequired;
        existing.isVisible = ca.isVisible;
        existing.sortOrder = ca.sortOrder;
        if (isTarget) {
          existing.source = 'LOCAL';
        }
      }
    }
  }

  // Filter visible attributes and sort by sortOrder, then by name
  const resolvedAttributes = Array.from(effectiveAttrMap.values())
    .filter((attr) => attr.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return {
    categoryId: category.id,
    categoryName: category.name,
    categoryPath: ancestry,
    attributes: resolvedAttributes,
    logistics: {
      weightMode: effectiveWeightMode,
      unitOfMeasureMode: effectiveUnitMode,
      defaultUnit: effectiveDefaultUnit,
    },
  };
}
