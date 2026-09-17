// ==============================================================================
// Ardab Market - Marketplace Category Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';

export async function listCategories(query = {}) {
  const where = {};
  if (query.activeOnly !== 'false') {
    where.isActive = true;
  }

  const categories = await prisma.marketplaceCategory.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          products: true,
          sellerCategories: true,
        },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    icon: cat.icon,
    description: cat.description,
    isActive: cat.isActive,
    productCount: cat._count.products,
    sellerCount: cat._count.sellerCategories,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));
}

export async function getCategoryById(id) {
  const category = await prisma.marketplaceCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true,
          sellerCategories: true,
        },
      },
    },
  });

  if (!category) {
    throw ApiError.notFound('Marketplace category not found', 'CATEGORY_NOT_FOUND');
  }

  return {
    ...category,
    productCount: category._count.products,
    sellerCount: category._count.sellerCategories,
  };
}

export async function createCategory(data) {
  const slug = data.slug || data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const existingName = await prisma.marketplaceCategory.findUnique({
    where: { name: data.name.trim() },
  });
  if (existingName) {
    throw ApiError.conflict(`Category name '${data.name}' already exists`, 'CATEGORY_NAME_EXISTS');
  }

  const existingSlug = await prisma.marketplaceCategory.findUnique({
    where: { slug },
  });
  if (existingSlug) {
    throw ApiError.conflict(`Category slug '${slug}' already exists`, 'CATEGORY_SLUG_EXISTS');
  }

  const category = await prisma.marketplaceCategory.create({
    data: {
      name: data.name.trim(),
      slug,
      icon: data.icon ? data.icon.trim() : null,
      description: data.description ? data.description.trim() : null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  logger.info('Marketplace category created', { categoryId: category.id, name: category.name });
  return category;
}

export async function updateCategory(id, data) {
  await getCategoryById(id);

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.slug !== undefined) updateData.slug = data.slug.trim();
  if (data.icon !== undefined) updateData.icon = data.icon ? data.icon.trim() : null;
  if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.marketplaceCategory.update({
    where: { id },
    data: updateData,
  });

  return updated;
}

/**
 * Returns marketplace categories assigned to a specific seller/product owner.
 * Only returns active categories.
 *
 * @param {string} sellerId
 * @returns {Promise<Array>} Categories assigned to the seller
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
    orderBy: {
      category: {
        name: 'asc',
      },
    },
  });

  return assignments.map((a) => ({
    id: a.category.id,
    name: a.category.name,
    slug: a.category.slug,
    icon: a.category.icon,
    description: a.category.description,
    isActive: a.category.isActive,
  }));
}

/**
 * Assigns a marketplace category to a seller.
 */
export async function assignCategoryToSeller(sellerId, categoryId) {
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
export async function removeCategoryFromSeller(sellerId, categoryId) {
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
