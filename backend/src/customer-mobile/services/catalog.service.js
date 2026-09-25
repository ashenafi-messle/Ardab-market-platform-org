// ==============================================================================
// Ardab Market - Customer Mobile Catalog Service
// ==============================================================================
// Domain: Customer Mobile App (backend/src/customer-mobile/services/catalog.service.js)
// High-performance category and product querying tailored specifically for
// the mobile application, utilizing existing PostgreSQL/Prisma tables.
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import {
  getDescendantCategoryIds,
  getCategoryPath,
  getCategoryTree as fetchAdminCategoryTree,
  listCategories as fetchAdminCategories,
  getCategoryById as fetchAdminCategoryById,
} from '../../admin/services/category.service.js';
import { getPublicProductRatingSummaries } from '../../customer/services/review.service.js';

/**
 * Format a lightweight customer mobile product card
 */
function formatMobileProductCard(product) {
  if (!product) return null;

  const images = (product.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    publicId: img.publicId,
    isPrimary: img.isPrimary,
    sortOrder: img.sortOrder,
  }));

  const primaryImage = images.find((i) => i.isPrimary) || images[0] || null;
  const ratingSummary = product.rating || { average: null, count: 0 };
  const rawSelling = Number(product.sellingPrice);
  const rawOriginal = product.originalPrice !== null && product.originalPrice !== undefined ? Number(product.originalPrice) : null;
  const discountPercent = product.discountPercent !== null && product.discountPercent !== undefined ? Number(product.discountPercent) : 0;

  const hasDiscount = discountPercent > 0 || (rawOriginal !== null && rawOriginal > rawSelling);
  const originalPrice = rawOriginal !== null ? rawOriginal : (hasDiscount && discountPercent > 0 ? Math.round(rawSelling / (1 - discountPercent / 100)) : rawSelling);
  const discountedPrice = rawSelling;
  const discount = hasDiscount ? (discountPercent > 0 ? discountPercent : Math.round(((originalPrice - rawSelling) / originalPrice) * 100)) : 0;

  return {
    id: product.id,
    itemCode: product.itemCode,
    name: product.name,
    description: product.description || null,
    price: hasDiscount ? originalPrice : rawSelling,
    sellingPrice: rawSelling,
    originalPrice: hasDiscount ? originalPrice : null,
    discountedPrice: hasDiscount ? discountedPrice : null,
    discount: hasDiscount ? discount : 0,
    discountPercent: hasDiscount ? discount : 0,
    hasDiscount,
    unit: product.unit || 'pc',
    status: product.status,
    cityAvailability: product.cityAvailability || ['All Cities'],
    createdAt: product.createdAt,
    category: product.category || null,
    seller: product.seller ? {
      id: product.seller.id,
      companyName: product.seller.companyName,
      name: product.seller.name,
      city: product.seller.city,
    } : null,
    images,
    primaryImage,
    thumbnail: primaryImage ? primaryImage.url : null,
    rating: ratingSummary,
    averageRating: ratingSummary.average,
    reviewCount: ratingSummary.count,
    ratingCount: ratingSummary.count,
  };
}

export class MobileCatalogService {
  /**
   * List products for customer mobile browsing with server-side pagination,
   * category descendant filtering, search, sorting, and rating summaries.
   */
  static async listProducts(query = {}) {
    const page = Math.max(1, parseInt(query.page || 1, 10));
    const limit = Math.min(48, Math.max(1, parseInt(query.limit || query.pageSize || 20, 10)));
    const skip = (page - 1) * limit;

    const where = {
      status: query.status && query.status !== 'ALL' ? query.status : 'ACTIVE',
    };

    // Category filter with recursive descendant resolution
    const categoryParam = query.categoryId || query.category;
    if (categoryParam && categoryParam !== 'all') {
      const rawCat = categoryParam.trim();
      let targetCatId = rawCat;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCat);
      if (!isUuid) {
        const foundCat = await prisma.marketplaceCategory.findUnique({
          where: { slug: rawCat.toLowerCase() },
          select: { id: true },
        });
        if (foundCat) targetCatId = foundCat.id;
      }

      const shouldIncludeDescendants = query.includeDescendants !== 'false' && query.includeDescendants !== false;
      if (shouldIncludeDescendants) {
        const descendants = await getDescendantCategoryIds(targetCatId);
        where.marketplaceCategoryId = { in: [targetCatId, ...descendants] };
      } else {
        where.marketplaceCategoryId = targetCatId;
      }
    }

    // Seller filter
    if (query.sellerId && query.sellerId.trim()) {
      where.sellerId = query.sellerId.trim();
    }

    // Price Range Filtering
    if (query.minPrice !== undefined && query.minPrice !== '' && !isNaN(Number(query.minPrice))) {
      where.sellingPrice = { ...(where.sellingPrice || {}), gte: Number(query.minPrice) };
    }
    if (query.maxPrice !== undefined && query.maxPrice !== '' && !isNaN(Number(query.maxPrice))) {
      where.sellingPrice = { ...(where.sellingPrice || {}), lte: Number(query.maxPrice) };
    }

    // City Availability
    if (query.city && query.city !== 'All Cities' && query.city.trim().length > 0) {
      where.OR = [
        { cityAvailability: { has: query.city.trim() } },
        { cityAvailability: { has: 'All Cities' } },
      ];
    }

    // Database-side Search Filter (name, itemCode, seller company, category name)
    if (query.search && query.search.trim().length > 0) {
      const s = query.search.trim();
      const searchConditions = [
        { itemCode: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { seller: { companyName: { contains: s, mode: 'insensitive' } } },
        { category: { name: { contains: s, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Sorting
    const sortParam = (query.sort || query.sortBy || 'createdAt_desc').toString();
    let orderBy = { createdAt: 'desc' };

    switch (sortParam) {
      case 'PRICE_LOW':
      case 'price_asc':
      case 'price:asc':
        orderBy = { sellingPrice: 'asc' };
        break;
      case 'PRICE_HIGH':
      case 'price_desc':
      case 'price:desc':
        orderBy = { sellingPrice: 'desc' };
        break;
      case 'name_asc':
      case 'name:asc':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
      case 'name:desc':
        orderBy = { name: 'desc' };
        break;
      case 'RATING':
      case 'rating':
      case 'POPULAR':
      case 'popular':
      case 'newest':
      case 'createdAt_desc':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    // Fetch products with minimal select
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          id: true,
          itemCode: true,
          name: true,
          description: true,
          unit: true,
          sellingPrice: true,
          originalPrice: true,
          discountPercent: true,
          status: true,
          cityAvailability: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              icon: true,
            },
          },
          seller: {
            select: {
              id: true,
              companyName: true,
              name: true,
              city: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              publicId: true,
              isPrimary: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
            take: 2,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const ratingSummaries = await getPublicProductRatingSummaries(products.map((product) => product.id));
    let formattedProducts = products.map((product) =>
      formatMobileProductCard({
        ...product,
        rating: ratingSummaries.get(product.id),
      })
    );

    if (sortParam === 'rating' || sortParam === 'RATING') {
      formattedProducts.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: formattedProducts,
      pagination: {
        page,
        pageSize: limit,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasNextPage: page < totalPages,
        hasPrev: page > 1,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Retrieves single product detail by ID with ancestry path, attributes, and full gallery
   */
  static async getProductDetails(productId) {
    if (!productId) {
      throw ApiError.badRequest('Product ID is required');
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        itemCode: true,
        name: true,
        description: true,
        unit: true,
        weight: true,
        sellingPrice: true,
        originalPrice: true,
        discountPercent: true,
        status: true,
        cityAvailability: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            icon: true,
            description: true,
          },
        },
        seller: {
          select: {
            id: true,
            companyName: true,
            name: true,
            phone: true,
            city: true,
            status: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            publicId: true,
            isPrimary: true,
            sortOrder: true,
            width: true,
            height: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        attributeValues: {
          select: {
            id: true,
            valueText: true,
            valueNumber: true,
            valueBoolean: true,
            valueDate: true,
            attributeDefinition: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                unit: true,
              },
            },
            option: {
              select: {
                id: true,
                label: true,
                value: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const ratingSummaries = await getPublicProductRatingSummaries([product.id]);
    const images = product.images || [];
    const primaryImage = images.find((i) => i.isPrimary) || images[0] || null;

    const formattedAttributeValues = (product.attributeValues || []).map((pav) => ({
      id: pav.id,
      name: pav.attributeDefinition?.name || null,
      slug: pav.attributeDefinition?.slug || null,
      type: pav.attributeDefinition?.type || null,
      unit: pav.attributeDefinition?.unit || null,
      optionLabel: pav.option?.label || null,
      optionValue: pav.option?.value || null,
      valueText: pav.valueText,
      valueNumber: pav.valueNumber !== null && pav.valueNumber !== undefined ? Number(pav.valueNumber) : null,
      valueBoolean: pav.valueBoolean,
      valueDate: pav.valueDate ? pav.valueDate.toISOString() : null,
    }));

    const ratingSummary = ratingSummaries.get(product.id) || { average: null, count: 0 };

    let categoryPath = [];
    if (product.category?.id) {
      try {
        categoryPath = await getCategoryPath(product.category.id);
      } catch {
        categoryPath = [
          {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
            isActive: true,
          },
        ];
      }
    }

    const rawSelling = Number(product.sellingPrice);
    const rawOriginal = product.originalPrice !== null && product.originalPrice !== undefined ? Number(product.originalPrice) : null;
    const discountPercent = product.discountPercent !== null && product.discountPercent !== undefined ? Number(product.discountPercent) : 0;

    const hasDiscount = discountPercent > 0 || (rawOriginal !== null && rawOriginal > rawSelling);
    const originalPrice = rawOriginal !== null ? rawOriginal : (hasDiscount && discountPercent > 0 ? Math.round(rawSelling / (1 - discountPercent / 100)) : rawSelling);
    const discountedPrice = rawSelling;
    const discount = hasDiscount ? (discountPercent > 0 ? discountPercent : Math.round(((originalPrice - rawSelling) / originalPrice) * 100)) : 0;

    return {
      ...product,
      weight: product.weight !== null && product.weight !== undefined ? Number(product.weight) : null,
      price: hasDiscount ? originalPrice : rawSelling,
      sellingPrice: rawSelling,
      originalPrice: hasDiscount ? originalPrice : null,
      discountedPrice: hasDiscount ? discountedPrice : null,
      discount: hasDiscount ? discount : 0,
      discountPercent: hasDiscount ? discount : 0,
      hasDiscount,
      images,
      primaryImage,
      thumbnail: primaryImage ? primaryImage.url : null,
      rating: ratingSummary,
      averageRating: ratingSummary.average,
      reviewCount: ratingSummary.count,
      ratingCount: ratingSummary.count,
      categoryPath,
      attributeValues: formattedAttributeValues,
    };
  }

  /**
   * Get products with active Super Admin discounts for Special Offers section
   */
  static async getSpecialOffers(query = {}) {
    const page = Math.max(1, parseInt(query.page || 1, 10));
    const limit = Math.min(48, Math.max(1, parseInt(query.limit || query.pageSize || 10, 10)));
    const skip = (page - 1) * limit;

    const where = {
      status: 'ACTIVE',
      discountPercent: { gt: 0 },
    };

    if (query.city && query.city !== 'All Cities') {
      where.cityAvailability = {
        hasSome: [query.city, 'All Cities'],
      };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          id: true,
          itemCode: true,
          name: true,
          description: true,
          unit: true,
          sellingPrice: true,
          originalPrice: true,
          discountPercent: true,
          status: true,
          cityAvailability: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              icon: true,
            },
          },
          seller: {
            select: {
              id: true,
              companyName: true,
              name: true,
              city: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              publicId: true,
              isPrimary: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
            take: 2,
          },
        },
        orderBy: [{ discountPercent: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const ratingSummaries = await getPublicProductRatingSummaries(products.map((p) => p.id));
    const formattedProducts = products.map((product) =>
      formatMobileProductCard({
        ...product,
        rating: ratingSummaries.get(product.id),
      })
    );

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: formattedProducts,
      pagination: {
        page,
        pageSize: limit,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasNextPage: page < totalPages,
        hasPrev: page > 1,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get categories flat or root only
   */
  static async listCategories(query = {}) {
    const params = { activeOnly: 'true', ...query };
    if (query.root === 'true' || query.root === true) {
      params.parentId = null;
    }
    return fetchAdminCategories(params);
  }

  /**
   * Get complete hierarchical category tree with unlimited depth
   */
  static async getCategoryTree() {
    return fetchAdminCategoryTree({ activeOnly: 'true' });
  }

  /**
   * Get category detail by ID
   */
  static async getCategoryById(id) {
    return fetchAdminCategoryById(id);
  }

  /**
   * Get server-side computed descendant IDs for category
   */
  static async getCategoryDescendants(id) {
    const descendantIds = await getDescendantCategoryIds(id);
    return {
      categoryId: id,
      descendantIds,
      allCategoryIds: [id, ...descendantIds],
    };
  }
}
