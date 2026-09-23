// ==============================================================================
// Ardab Market - Customer Wishlist Service
// ==============================================================================
// Handles persistent server-side wishlist management.
// Falls back gracefully when product is deleted (item kept, product null).

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { getPublicProductRatingSummaries } from './review.service.js';

// Product include for wishlist responses
const PRODUCT_INCLUDE = {
  images: {
    where: { isPrimary: true },
    take: 1,
    orderBy: { sortOrder: 'asc' },
  },
  category: {
    select: { id: true, name: true, slug: true },
  },
  seller: {
    select: { id: true, companyName: true, name: true },
  },
};

/**
 * Formats a wishlist item for API response
 */
function formatWishlistItem(item, rating = { average: null, count: 0 }) {
  const product = item.product;
  return {
    id: item.id,
    customerId: item.customerId,
    productId: item.productId,
    addedAt: item.addedAt.toISOString(),
    product: product
      ? {
          id: product.id,
          name: product.name,
          itemCode: product.itemCode,
          sellingPrice: product.sellingPrice ? product.sellingPrice.toString() : '0.00',
          priceEtb: product.sellingPrice ? Number(product.sellingPrice) : 0,
          unit: product.unit || 'pc',
          status: product.status,
          category: product.category || null,
          seller: product.seller || null,
          primaryImage: product.images?.[0]
            ? { url: product.images[0].url, publicId: product.images[0].publicId }
            : null,
          rating,
        }
      : null,
  };
}

/**
 * GET /api/customer/wishlist
 * Returns the authenticated customer's full wishlist with product details.
 *
 * @param {string} customerId
 * @returns {Promise<{items: any[], total: number}>}
 */
export async function getWishlist(customerId) {
  const items = await prisma.customerWishlistItem.findMany({
    where: { customerId },
    orderBy: { addedAt: 'desc' },
    include: {
      product: {
        include: PRODUCT_INCLUDE,
      },
    },
  });

  const ratingSummaries = await getPublicProductRatingSummaries(
    items.map((item) => item.productId).filter(Boolean)
  );

  return {
    items: items.map((item) => formatWishlistItem(item, ratingSummaries.get(item.productId))),
    total: items.length,
  };
}

/**
 * POST /api/customer/wishlist/toggle
 * Adds or removes a product from the wishlist (idempotent toggle).
 *
 * @param {string} customerId
 * @param {string} productId
 * @returns {Promise<{action: 'added'|'removed', item?: any}>}
 */
export async function toggleWishlistItem(customerId, productId) {
  // Validate product exists and is accessible
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: PRODUCT_INCLUDE,
  });

  if (!product) {
    throw ApiError.notFound(`Product not found.`);
  }

  // Check if already in wishlist
  const existing = await prisma.customerWishlistItem.findUnique({
    where: { customerId_productId: { customerId, productId } },
  });

  if (existing) {
    // Remove
    await prisma.customerWishlistItem.delete({
      where: { id: existing.id },
    });
    return { action: 'removed', productId };
  }

  // Add
  const created = await prisma.customerWishlistItem.create({
    data: {
      customerId,
      productId,
    },
    include: {
      product: { include: PRODUCT_INCLUDE },
    },
  });

  const ratingSummaries = await getPublicProductRatingSummaries([productId]);
  return { action: 'added', item: formatWishlistItem(created, ratingSummaries.get(productId)) };
}

/**
 * DELETE /api/customer/wishlist/:productId
 * Removes a single product from the customer wishlist.
 *
 * @param {string} customerId
 * @param {string} productId
 */
export async function removeFromWishlist(customerId, productId) {
  const existing = await prisma.customerWishlistItem.findUnique({
    where: { customerId_productId: { customerId, productId } },
  });

  if (!existing) {
    throw ApiError.notFound('Wishlist item not found.');
  }

  await prisma.customerWishlistItem.delete({ where: { id: existing.id } });
  return { removed: true, productId };
}

/**
 * DELETE /api/customer/wishlist
 * Clears the entire wishlist for a customer.
 *
 * @param {string} customerId
 */
export async function clearWishlist(customerId) {
  const result = await prisma.customerWishlistItem.deleteMany({
    where: { customerId },
  });
  return { removed: result.count };
}

/**
 * POST /api/customer/wishlist/sync
 * Syncs a local (localStorage) wishlist to the database.
 * Used when a customer logs in with local wishlist data.
 * Idempotent: existing items are skipped (upsert via skipDuplicates).
 *
 * @param {string} customerId
 * @param {string[]} productIds
 * @returns {Promise<{synced: number, total: number}>}
 */
export async function syncWishlist(customerId, productIds) {
  if (!productIds || productIds.length === 0) {
    const existing = await getWishlist(customerId);
    return { synced: 0, total: existing.total };
  }

  // Validate all product IDs exist
  const validProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });

  const validIds = validProducts.map((p) => p.id);

  if (validIds.length > 0) {
    await prisma.customerWishlistItem.createMany({
      data: validIds.map((productId) => ({
        customerId,
        productId,
      })),
      skipDuplicates: true,
    });
  }

  const result = await getWishlist(customerId);
  return { synced: validIds.length, total: result.total, items: result.items };
}

/**
 * GET /api/customer/wishlist/check/:productId
 * Checks if a specific product is in the customer's wishlist.
 *
 * @param {string} customerId
 * @param {string} productId
 * @returns {Promise<{inWishlist: boolean, productId: string}>}
 */
export async function checkWishlistItem(customerId, productId) {
  const item = await prisma.customerWishlistItem.findUnique({
    where: { customerId_productId: { customerId, productId } },
    select: { id: true },
  });
  return { inWishlist: !!item, productId };
}
