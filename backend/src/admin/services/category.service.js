// ==============================================================================
// Ardab Market - Hierarchical Marketplace Category Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Record an audit log entry for category mutations
 */
async function recordCategoryAuditLog({ adminUser, action, categoryId, ipAddress, changesSummary }) {
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
        entity: 'MarketplaceCategory',
        entityId: categoryId,
        ipAddress: ipAddress || null,
        changesSummary: changesSummary || null,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to create audit log for category operation', { error: err.message, action });
  }
}

/**
 * Helper to compute the full ancestry path for a given category
 */
export async function getCategoryPath(categoryId) {
  const path = [];
  let currentId = categoryId;
  const visited = new Set();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = await prisma.marketplaceCategory.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, slug: true, parentId: true, isActive: true },
    });
    if (!cat) break;
    path.unshift({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      isActive: cat.isActive,
    });
    currentId = cat.parentId;
  }

  return path;
}

/**
 * Helper to recursively collect all descendant category IDs (supports arbitrary depth efficiently)
 */
export async function getDescendantCategoryIds(categoryId) {
  if (!categoryId) return [];

  try {
    // Efficient PostgreSQL recursive CTE to collect all descendants at any arbitrary depth in a single database roundtrip
    const result = await prisma.$queryRaw`
      WITH RECURSIVE category_tree AS (
        SELECT id FROM "marketplace_categories"
        WHERE "parentId" = ${categoryId}
        UNION ALL
        SELECT c.id FROM "marketplace_categories" c
        INNER JOIN category_tree ct ON c."parentId" = ct.id
      )
      SELECT id FROM category_tree;
    `;
    return result.map((r) => r.id);
  } catch (error) {
    // Fallback queue-based BFS traversal in case raw query fails
    const descendantIds = [];
    const queue = [categoryId];
    const visited = new Set([categoryId]);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = await prisma.marketplaceCategory.findMany({
        where: { parentId: currentId },
        select: { id: true },
      });
      for (const child of children) {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          descendantIds.push(child.id);
          queue.push(child.id);
        }
      }
    }
    return descendantIds;
  }
}

/**
 * List categories flat with flexible filters (supports lazy loading with parentId)
 */
export async function listCategories(query = {}) {
  const where = {};

  if (query.activeOnly === 'true' || query.status === 'ACTIVE') {
    where.isActive = true;
  } else if (query.status === 'INACTIVE') {
    where.isActive = false;
  }

  if (query.parentId !== undefined) {
    where.parentId = query.parentId === 'null' || query.parentId === '' ? null : query.parentId;
  }

  if (query.search && query.search.trim().length > 0) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { slug: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
    ];
  }

  const categories = await prisma.marketplaceCategory.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      parent: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: {
          products: true,
          sellerCategories: true,
          children: true,
        },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    parentId: cat.parentId,
    parent: cat.parent,
    name: cat.name,
    slug: cat.slug,
    icon: cat.icon,
    description: cat.description,
    imageUrl: cat.imageUrl,
    isActive: cat.isActive,
    sortOrder: cat.sortOrder,
    productCount: cat._count.products,
    sellerCount: cat._count.sellerCategories,
    childrenCount: cat._count.children,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));
}

/**
 * Build and return the full hierarchical category tree
 */
export async function getCategoryTree(query = {}) {
  const where = {};
  if (query.activeOnly === 'true' || query.status === 'ACTIVE') {
    where.isActive = true;
  }

  const allCategories = await prisma.marketplaceCategory.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          products: true,
          sellerCategories: true,
          children: true,
        },
      },
    },
  });

  // Map into parent-child tree structure
  const categoryMap = new Map();
  const roots = [];

  allCategories.forEach((cat) => {
    categoryMap.set(cat.id, {
      id: cat.id,
      parentId: cat.parentId,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      description: cat.description,
      imageUrl: cat.imageUrl,
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
      productCount: cat._count.products,
      sellerCount: cat._count.sellerCategories,
      childrenCount: cat._count.children,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      children: [],
    });
  });

  categoryMap.forEach((node) => {
    if (node.parentId && categoryMap.has(node.parentId)) {
      categoryMap.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Calculate cumulative subtree product counts recursively so parent counts reflect all descendant products
  function calculateSubtreeCounts(node) {
    let total = node.productCount || 0;
    for (const child of node.children) {
      total += calculateSubtreeCounts(child);
    }
    node.productCount = total;
    return total;
  }

  roots.forEach((root) => {
    calculateSubtreeCounts(root);
  });

  return roots;
}

/**
 * Get category details by ID including ancestry path and immediate children
 */
export async function getCategoryById(id) {
  const category = await prisma.marketplaceCategory.findUnique({
    where: { id },
    include: {
      parent: {
        select: { id: true, name: true, slug: true, isActive: true },
      },
      children: {
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { products: true, children: true },
          },
        },
      },
      _count: {
        select: {
          products: true,
          sellerCategories: true,
          children: true,
        },
      },
    },
  });

  if (!category) {
    throw ApiError.notFound('Marketplace category not found', 'CATEGORY_NOT_FOUND');
  }

  const path = await getCategoryPath(id);

  return {
    ...category,
    path,
    productCount: category._count.products,
    sellerCount: category._count.sellerCategories,
    childrenCount: category._count.children,
  };
}

/**
 * Get immediate children of a category
 */
export async function getCategoryChildren(id, query = {}) {
  const category = await prisma.marketplaceCategory.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!category) {
    throw ApiError.notFound('Marketplace category not found', 'CATEGORY_NOT_FOUND');
  }

  const where = { parentId: id };
  if (query.activeOnly === 'true' || query.status === 'ACTIVE') {
    where.isActive = true;
  }

  const children = await prisma.marketplaceCategory.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          products: true,
          sellerCategories: true,
          children: true,
        },
      },
    },
  });

  return children.map((cat) => ({
    id: cat.id,
    parentId: cat.parentId,
    name: cat.name,
    slug: cat.slug,
    icon: cat.icon,
    description: cat.description,
    imageUrl: cat.imageUrl,
    isActive: cat.isActive,
    sortOrder: cat.sortOrder,
    productCount: cat._count.products,
    sellerCount: cat._count.sellerCategories,
    childrenCount: cat._count.children,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));
}

/**
 * Create a new category (root or child) with validation and audit logging
 */
export async function createCategory(data, adminUser = null, ipAddress = null) {
  const name = data.name.trim();
  const slug = data.slug
    ? data.slug.trim().toLowerCase()
    : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // 1. Verify parent if specified
  let parent = null;
  if (data.parentId) {
    parent = await prisma.marketplaceCategory.findUnique({
      where: { id: data.parentId },
    });
    if (!parent) {
      throw ApiError.badRequest('Parent category not found', 'PARENT_CATEGORY_NOT_FOUND');
    }
  }

  // 2. Validate slug uniqueness
  const existingSlug = await prisma.marketplaceCategory.findUnique({
    where: { slug },
  });
  if (existingSlug) {
    throw ApiError.conflict(`Category slug '${slug}' already exists`, 'CATEGORY_SLUG_EXISTS');
  }

  // 3. Sibling name collision check
  const existingSibling = await prisma.marketplaceCategory.findFirst({
    where: {
      parentId: data.parentId || null,
      name: { equals: name, mode: 'insensitive' },
    },
  });
  if (existingSibling) {
    throw ApiError.conflict(
      `A category named '${name}' already exists under the ${parent ? `parent '${parent.name}'` : 'root level'}`,
      'CATEGORY_NAME_EXISTS'
    );
  }

  // 4. Create category in database
  const category = await prisma.marketplaceCategory.create({
    data: {
      name,
      slug,
      parentId: data.parentId || null,
      icon: data.icon ? data.icon.trim() : null,
      description: data.description ? data.description.trim() : null,
      imageUrl: data.imageUrl ? data.imageUrl.trim() : null,
      sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : 0,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    },
  });

  logger.info('Marketplace category created', { categoryId: category.id, name: category.name, parentId: category.parentId });

  // 5. Audit Log
  await recordCategoryAuditLog({
    adminUser,
    action: 'CATEGORY_CREATED',
    categoryId: category.id,
    ipAddress,
    changesSummary: `Created category "${category.name}" (slug: ${category.slug}) under parent ${parent ? `"${parent.name}"` : 'ROOT'}`,
  });

  const path = await getCategoryPath(category.id);
  return { ...category, path };
}

/**
 * Update an existing category with cycle prevention and validation
 */
export async function updateCategory(id, data, adminUser = null, ipAddress = null) {
  const existing = await prisma.marketplaceCategory.findUnique({
    where: { id },
  });

  if (!existing) {
    throw ApiError.notFound('Marketplace category not found', 'CATEGORY_NOT_FOUND');
  }

  const updateData = {};
  const changes = [];

  // Check parent change & cycle detection
  if (data.parentId !== undefined && data.parentId !== existing.parentId) {
    if (data.parentId === id) {
      throw ApiError.badRequest('A category cannot be its own parent', 'CATEGORY_CYCLE_DETECTED');
    }

    if (data.parentId) {
      const parent = await prisma.marketplaceCategory.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw ApiError.badRequest('Target parent category not found', 'PARENT_CATEGORY_NOT_FOUND');
      }

      // Check if target parent is a descendant of this category (would cause cycle)
      const descendants = await getDescendantCategoryIds(id);
      if (descendants.includes(data.parentId)) {
        throw ApiError.badRequest(
          'Cannot move category into one of its own subcategories (circular hierarchy detected)',
          'CATEGORY_CYCLE_DETECTED'
        );
      }
    }

    updateData.parentId = data.parentId || null;
    changes.push(`parentId: ${existing.parentId} -> ${data.parentId}`);
  }

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed !== existing.name) {
      const targetParent = updateData.parentId !== undefined ? updateData.parentId : existing.parentId;
      const siblingConflict = await prisma.marketplaceCategory.findFirst({
        where: {
          id: { not: id },
          parentId: targetParent,
          name: { equals: trimmed, mode: 'insensitive' },
        },
      });
      if (siblingConflict) {
        throw ApiError.conflict(`A category named '${trimmed}' already exists under this parent level`, 'CATEGORY_NAME_EXISTS');
      }
      updateData.name = trimmed;
      changes.push(`name: "${existing.name}" -> "${trimmed}"`);
    }
  }

  if (data.slug !== undefined) {
    const trimmedSlug = data.slug.trim().toLowerCase();
    if (trimmedSlug !== existing.slug) {
      const slugConflict = await prisma.marketplaceCategory.findUnique({
        where: { slug: trimmedSlug },
      });
      if (slugConflict && slugConflict.id !== id) {
        throw ApiError.conflict(`Slug '${trimmedSlug}' is already in use by another category`, 'CATEGORY_SLUG_EXISTS');
      }
      updateData.slug = trimmedSlug;
      changes.push(`slug: "${existing.slug}" -> "${trimmedSlug}"`);
    }
  }

  if (data.icon !== undefined) updateData.icon = data.icon ? data.icon.trim() : null;
  if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl ? data.imageUrl.trim() : null;
  if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
  if (data.isActive !== undefined) {
    updateData.isActive = Boolean(data.isActive);
    changes.push(`isActive: ${existing.isActive} -> ${Boolean(data.isActive)}`);
  }

  const updated = await prisma.marketplaceCategory.update({
    where: { id },
    data: updateData,
  });

  if (changes.length > 0) {
    await recordCategoryAuditLog({
      adminUser,
      action: 'CATEGORY_UPDATED',
      categoryId: updated.id,
      ipAddress,
      changesSummary: `Updated category "${updated.name}": ${changes.join(', ')}`,
    });
  }

  const path = await getCategoryPath(updated.id);
  return { ...updated, path };
}

/**
 * Move a category safely under a new parent or to root level
 */
export async function moveCategory(id, targetParentId, adminUser = null, ipAddress = null) {
  return updateCategory(id, { parentId: targetParentId }, adminUser, ipAddress);
}

/**
 * Update category active / inactive status
 */
export async function updateCategoryStatus(id, isActive, adminUser = null, ipAddress = null) {
  return updateCategory(id, { isActive }, adminUser, ipAddress);
}

/**
 * Safe delete category with validation against products, children, and sellers
 */
export async function deleteCategory(id, adminUser = null, ipAddress = null) {
  const category = await prisma.marketplaceCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true,
          children: true,
          sellerCategories: true,
        },
      },
    },
  });

  if (!category) {
    throw ApiError.notFound('Marketplace category not found', 'CATEGORY_NOT_FOUND');
  }

  if (category._count.children > 0) {
    throw ApiError.badRequest(
      `Cannot delete category '${category.name}' because it has ${category._count.children} subcategory/subcategories. Move or remove its children first, or deactivate the category.`,
      'CATEGORY_HAS_CHILDREN'
    );
  }

  if (category._count.products > 0) {
    throw ApiError.badRequest(
      `Cannot delete category '${category.name}' because it contains ${category._count.products} associated product(s). Please reassign products first, or deactivate this category.`,
      'CATEGORY_HAS_PRODUCTS'
    );
  }

  // Safe delete seller assignments
  if (category._count.sellerCategories > 0) {
    await prisma.sellerMarketplaceCategory.deleteMany({
      where: { categoryId: id },
    });
  }

  await prisma.marketplaceCategory.delete({
    where: { id },
  });

  logger.info('Marketplace category deleted', { categoryId: id, name: category.name });

  await recordCategoryAuditLog({
    adminUser,
    action: 'CATEGORY_DELETED',
    categoryId: id,
    ipAddress,
    changesSummary: `Deleted category "${category.name}" (slug: ${category.slug})`,
  });

  return { success: true, message: `Category '${category.name}' deleted successfully` };
}

/**
 * Returns marketplace categories assigned to a specific seller/product owner.
 * Only returns active categories.
 */
export async function getSellerCategories(sellerId) {
  const seller = await prisma.supplier.findUnique({
    where: { id: sellerId },
    select: { id: true, companyName: true, status: true },
  });

  if (!seller) {
    throw ApiError.notFound('Seller / Supplier not found', 'SELLER_NOT_FOUND');
  }

  const assignments = await prisma.sellerMarketplaceCategory.findMany({
    where: {
      sellerId,
      category: {
        isActive: true,
      },
    },
    include: {
      category: true,
    },
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { category: { name: 'asc' } },
    ],
  });

  return assignments.map((a) => ({
    id: a.category.id,
    parentId: a.category.parentId,
    name: a.category.name,
    slug: a.category.slug,
    icon: a.category.icon,
    description: a.category.description,
    imageUrl: a.category.imageUrl,
    isActive: a.category.isActive,
    sortOrder: a.category.sortOrder,
  }));
}

/**
 * Assigns a marketplace category to a seller.
 */
export async function assignCategoryToSeller(sellerId, categoryId, adminUser = null, ipAddress = null) {
  const seller = await prisma.supplier.findUnique({
    where: { id: sellerId },
  });
  if (!seller) {
    throw ApiError.notFound('Seller / Supplier not found', 'SELLER_NOT_FOUND');
  }

  const category = await prisma.marketplaceCategory.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    throw ApiError.notFound('Marketplace category not found', 'CATEGORY_NOT_FOUND');
  }
  if (!category.isActive) {
    throw ApiError.badRequest(`Category '${category.name}' is inactive and cannot be assigned`, 'CATEGORY_INACTIVE');
  }

  const assignment = await prisma.sellerMarketplaceCategory.upsert({
    where: {
      sellerId_categoryId: {
        sellerId,
        categoryId,
      },
    },
    create: {
      sellerId,
      categoryId,
    },
    update: {},
    include: {
      category: true,
    },
  });

  return assignment.category;
}

/**
 * Removes a category assignment from a seller.
 */
export async function removeCategoryFromSeller(sellerId, categoryId, adminUser = null, ipAddress = null) {
  try {
    await prisma.sellerMarketplaceCategory.delete({
      where: {
        sellerId_categoryId: {
          sellerId,
          categoryId,
        },
      },
    });
    return { success: true };
  } catch {
    throw ApiError.notFound('Category assignment not found for this seller', 'ASSIGNMENT_NOT_FOUND');
  }
}
