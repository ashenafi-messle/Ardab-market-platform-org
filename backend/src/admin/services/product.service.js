// ==============================================================================
// Ardab Market - Product Management Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { getPaginationParams } from '../../shared/utils/pagination.js';
import { generateNextItemCode } from './itemCode.service.js';
import {
  uploadImageToStorage,
  deleteImageFromStorage,
  cleanupUploadedImages,
  generateDeliveryUrl,
} from './productImage.service.js';

async function recordProductAuditLog({ adminUser, action, productId, ipAddress, changesSummary }) {
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
        entity: 'Product',
        entityId: productId,
        ipAddress: ipAddress || null,
        changesSummary: changesSummary || null,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to create audit log for product operation', { error: err.message, action });
  }
}

/**
 * Helper to sanitize and format product representation for API responses
 */
function formatProduct(product) {
  if (!product) return null;

  const formattedImages = (product.images || []).map((img) => {
    if (typeof img === 'object' && img !== null) {
      return {
        id: img.id,
        productId: img.productId,
        url: img.url,
        publicId: img.publicId,
        width: img.width,
        height: img.height,
        format: img.format,
        bytes: img.bytes,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
        thumbnailUrl: generateDeliveryUrl(img.publicId, { width: 200, height: 200, crop: 'fill' }),
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
      };
    }
    return {
      url: img,
      isPrimary: false,
      sortOrder: 0,
    };
  });

  return {
    ...product,
    costPrice: product.costPrice !== null && product.costPrice !== undefined ? Number(product.costPrice) : null,
    sellingPrice: Number(product.sellingPrice),
    weight: Number(product.weight),
    images: formattedImages,
    primaryImage: formattedImages.find((img) => img.isPrimary) || formattedImages[0] || null,
  };
}

/**
 * List products with pagination, search, and filtering
 */
export async function listProducts(query = {}) {
  const { page, pageSize, skip, take, formatMeta } = getPaginationParams(query);

  const where = {};

  // Status Filter
  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  // Seller / Product Owner Filter
  if (query.sellerId && query.sellerId.trim()) {
    where.sellerId = query.sellerId.trim();
  }

  // Marketplace Category Filter
  if (query.categoryId && query.categoryId !== 'all') {
    where.marketplaceCategoryId = query.categoryId.trim();
  }

  // City Availability Filter
  if (query.city && query.city !== 'All Cities' && query.city.trim().length > 0) {
    where.OR = [
      { cityAvailability: { has: query.city.trim() } },
      { cityAvailability: { has: 'All Cities' } },
    ];
  }

  // Search Filter (itemCode, name, seller company, category name)
  if (query.search && query.search.trim().length > 0) {
    const s = query.search.trim();
    const searchConditions = [
      { itemCode: { contains: s, mode: 'insensitive' } },
      { name: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
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

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  const formattedItems = items.map(formatProduct);

  return {
    items: formattedItems,
    products: formattedItems,
    pagination: formatMeta(total),
  };
}

/**
 * Get detailed product profile by ID
 */
export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true,
          companyName: true,
          name: true,
          phone: true,
          email: true,
          city: true,
          status: true,
          paymentMethods: {
            select: {
              id: true,
              paymentMethod: true,
              accountNumber: true,
              isPrimary: true,
            },
          },
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          description: true,
        },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!product) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  return formatProduct(product);
}

/**
 * Create a new product with atomic sequential itemCode generation and optional Cloudinary image uploads
 */
export async function createProduct(data, filesOrAdmin = [], adminOrIp = null, maybeIp = null) {
  let files = [];
  let adminUser = null;
  let ipAddress = null;

  if (Array.isArray(filesOrAdmin)) {
    files = filesOrAdmin;
    adminUser = adminOrIp;
    ipAddress = maybeIp;
  } else {
    adminUser = filesOrAdmin;
    ipAddress = adminOrIp;
  }

  // 1. Validate Seller Existence & Active Status
  const seller = await prisma.supplier.findUnique({
    where: { id: data.sellerId },
    select: { id: true, companyName: true, status: true },
  });

  if (!seller) {
    throw ApiError.badRequest('Selected seller / product owner does not exist', 'SELLER_NOT_FOUND');
  }

  if (seller.status !== 'ACTIVE') {
    throw ApiError.badRequest(
      `Seller '${seller.companyName}' is currently ${seller.status} and cannot be assigned products`,
      'SELLER_INACTIVE'
    );
  }

  // 2. Validate Marketplace Category Existence & Active Status
  const category = await prisma.marketplaceCategory.findUnique({
    where: { id: data.marketplaceCategoryId },
    select: { id: true, name: true, isActive: true },
  });

  if (!category) {
    throw ApiError.badRequest('Selected marketplace category does not exist', 'CATEGORY_NOT_FOUND');
  }

  if (!category.isActive) {
    throw ApiError.badRequest(
      `Category '${category.name}' is inactive and cannot be assigned to products`,
      'CATEGORY_INACTIVE'
    );
  }

  // 3. Validate Seller ↔ Category Relationship
  const assignment = await prisma.sellerMarketplaceCategory.findUnique({
    where: {
      sellerId_categoryId: {
        sellerId: data.sellerId,
        categoryId: data.marketplaceCategoryId,
      },
    },
  });

  if (!assignment) {
    throw ApiError.badRequest(
      `Marketplace category '${category.name}' is not assigned to seller '${seller.companyName}'`,
      'SELLER_CATEGORY_MISMATCH'
    );
  }

  // 4. Upload Images to Cloudinary before database transaction
  const uploadedPublicIds = [];
  const imageRecordsToCreate = [];

  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploaded = await uploadImageToStorage(file.buffer, {
        folder: 'ardab-market/products',
      });
      uploadedPublicIds.push(uploaded.publicId);
      imageRecordsToCreate.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
        width: uploaded.width,
        height: uploaded.height,
        format: uploaded.format,
        bytes: uploaded.bytes,
        sortOrder: i,
        isPrimary: i === 0,
      });
    }
  } else if (Array.isArray(data.images) && data.images.length > 0) {
    // Support pre-provided image strings (e.g. tests or JSON seeds)
    data.images.forEach((img, i) => {
      const isObj = typeof img === 'object' && img !== null;
      imageRecordsToCreate.push({
        url: isObj ? img.url : img,
        publicId: isObj && img.publicId ? img.publicId : `img_seed_${Date.now()}_${i}`,
        sortOrder: isObj && img.sortOrder !== undefined ? img.sortOrder : i,
        isPrimary: isObj && img.isPrimary !== undefined ? img.isPrimary : i === 0,
      });
    });
  }

  // 5. Atomic Product Creation + Item Code Generation in Transaction with Compensating Cleanup
  let product;
  try {
    product = await prisma.$transaction(async (tx) => {
      const itemCode = await generateNextItemCode(tx);

      const newProduct = await tx.product.create({
        data: {
          itemCode,
          name: data.name.trim(),
          description: data.description ? data.description.trim() : null,
          sellerId: data.sellerId,
          marketplaceCategoryId: data.marketplaceCategoryId,
          unit: data.unit.trim(),
          weight: data.weight,
          costPrice: data.costPrice !== undefined && data.costPrice !== null ? data.costPrice : null,
          sellingPrice: data.sellingPrice,
          status: data.status || 'ACTIVE',
          cityAvailability: Array.isArray(data.cityAvailability) && data.cityAvailability.length > 0
            ? data.cityAvailability
            : ['All Cities'],
          images: imageRecordsToCreate.length > 0
            ? { create: imageRecordsToCreate }
            : undefined,
        },
        include: {
          seller: {
            select: {
              id: true,
              companyName: true,
              name: true,
              city: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      return newProduct;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });
  } catch (dbError) {
    // COMPENSATING CLEANUP:
    // If the database transaction fails, clean up all newly uploaded Cloudinary assets!
    if (uploadedPublicIds.length > 0) {
      logger.warn('Compensating cleanup triggered after product creation failure', {
        uploadedCount: uploadedPublicIds.length,
        publicIds: uploadedPublicIds,
        dbError: dbError.message,
      });
      await cleanupUploadedImages(uploadedPublicIds);
    }
    throw dbError;
  }

  logger.info('Product created successfully', {
    productId: product.id,
    itemCode: product.itemCode,
    name: product.name,
    sellerId: product.sellerId,
    imagesCount: imageRecordsToCreate.length,
  });

  // 6. Record Audit Log
  await recordProductAuditLog({
    adminUser,
    action: 'PRODUCT_CREATED',
    productId: product.id,
    ipAddress,
    changesSummary: `Created product "${product.name}" with item code [${product.itemCode}] under seller "${product.seller.companyName}" with ${imageRecordsToCreate.length} image(s)`,
  });

  return formatProduct(product);
}

/**
 * Update an existing product. Item code is immutable.
 */
export async function updateProduct(id, data, adminUser = null, ipAddress = null) {
  const existing = await prisma.product.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, companyName: true, status: true } },
      category: { select: { id: true, name: true, isActive: true } },
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!existing) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  const targetSellerId = data.sellerId || existing.sellerId;
  const targetCategoryId = data.marketplaceCategoryId || existing.marketplaceCategoryId;

  // If seller or category changed, validate existence, active status, and relationship
  if (data.sellerId || data.marketplaceCategoryId) {
    const seller = await prisma.supplier.findUnique({
      where: { id: targetSellerId },
      select: { id: true, companyName: true, status: true },
    });
    if (!seller) {
      throw ApiError.badRequest('Seller not found', 'SELLER_NOT_FOUND');
    }
    if (seller.status !== 'ACTIVE') {
      throw ApiError.badRequest(`Seller '${seller.companyName}' is currently ${seller.status}`, 'SELLER_INACTIVE');
    }

    const category = await prisma.marketplaceCategory.findUnique({
      where: { id: targetCategoryId },
      select: { id: true, name: true, isActive: true },
    });
    if (!category) {
      throw ApiError.badRequest('Category not found', 'CATEGORY_NOT_FOUND');
    }
    if (!category.isActive) {
      throw ApiError.badRequest(`Category '${category.name}' is inactive`, 'CATEGORY_INACTIVE');
    }

    const assignment = await prisma.sellerMarketplaceCategory.findUnique({
      where: {
        sellerId_categoryId: {
          sellerId: targetSellerId,
          categoryId: targetCategoryId,
        },
      },
    });
    if (!assignment) {
      throw ApiError.badRequest(
        `Category '${category.name}' is not assigned to seller '${seller.companyName}'`,
        'SELLER_CATEGORY_MISMATCH'
      );
    }
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) {
    updateData.description = data.description ? data.description.trim() : null;
  }
  if (data.sellerId !== undefined) updateData.sellerId = data.sellerId;
  if (data.marketplaceCategoryId !== undefined) updateData.marketplaceCategoryId = data.marketplaceCategoryId;
  if (data.unit !== undefined) updateData.unit = data.unit.trim();
  if (data.weight !== undefined) updateData.weight = data.weight;
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
  if (data.sellingPrice !== undefined) updateData.sellingPrice = data.sellingPrice;
  if (data.cityAvailability !== undefined) updateData.cityAvailability = data.cityAvailability;
  if (data.status !== undefined) updateData.status = data.status;

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      seller: {
        select: {
          id: true,
          companyName: true,
          name: true,
          city: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  await recordProductAuditLog({
    adminUser,
    action: 'PRODUCT_UPDATED',
    productId: updated.id,
    ipAddress,
    changesSummary: `Updated product "${updated.name}" [${updated.itemCode}]`,
  });

  return formatProduct(updated);
}

/**
 * Toggle or update product status
 */
export async function toggleProductStatus(id, newStatus = null, adminUser = null, ipAddress = null) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true, itemCode: true, status: true },
  });

  if (!existing) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  let targetStatus = newStatus;
  if (!targetStatus) {
    targetStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { status: targetStatus },
    include: {
      seller: {
        select: {
          id: true,
          companyName: true,
          name: true,
          city: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  await recordProductAuditLog({
    adminUser,
    action: 'PRODUCT_STATUS_CHANGED',
    productId: updated.id,
    ipAddress,
    changesSummary: `Changed product status from ${existing.status} to ${targetStatus} for [${updated.itemCode}]`,
  });

  return formatProduct(updated);
}

/**
 * Soft delete or archive a product
 */
export async function deleteProduct(id, adminUser = null, ipAddress = null) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true, itemCode: true, status: true },
  });

  if (!existing) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  await recordProductAuditLog({
    adminUser,
    action: 'PRODUCT_DELETED',
    productId: updated.id,
    ipAddress,
    changesSummary: `Archived product "${existing.name}" [${existing.itemCode}]`,
  });

  return { id: updated.id, status: updated.status, message: 'Product archived successfully' };
}

/**
 * Add a new image to an existing product
 */
export async function addProductImage(productId, file, options = {}, adminUser = null, ipAddress = null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });

  if (!product) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  if (!file || !file.buffer) {
    throw ApiError.badRequest('No image file provided for upload', 'MISSING_IMAGE_FILE');
  }

  // Upload to Cloudinary
  const uploaded = await uploadImageToStorage(file.buffer, {
    folder: 'ardab-market/products',
  });

  try {
    const isFirst = product.images.length === 0;
    const shouldBePrimary = options.isPrimary === true || isFirst;

    const newImage = await prisma.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }

      const nextSortOrder = options.sortOrder !== undefined
        ? options.sortOrder
        : product.images.length;

      return tx.productImage.create({
        data: {
          productId,
          url: uploaded.url,
          publicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
          format: uploaded.format,
          bytes: uploaded.bytes,
          sortOrder: nextSortOrder,
          isPrimary: shouldBePrimary,
        },
      });
    });

    await recordProductAuditLog({
      adminUser,
      action: 'PRODUCT_IMAGE_ADDED',
      productId,
      ipAddress,
      changesSummary: `Added new image to product "${product.name}" [${product.itemCode}]. Primary: ${shouldBePrimary}`,
    });

    return {
      ...newImage,
      thumbnailUrl: generateDeliveryUrl(newImage.publicId, { width: 200, height: 200, crop: 'fill' }),
    };
  } catch (err) {
    // Compensating cleanup on DB failure
    await deleteImageFromStorage(uploaded.publicId);
    throw err;
  }
}

/**
 * Delete an image asset belonging to a product
 */
export async function deleteProductImage(productId, imageId, adminUser = null, ipAddress = null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, itemCode: true },
  });

  if (!product) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId },
  });

  if (!image) {
    throw ApiError.notFound('Product image not found or does not belong to this product', 'IMAGE_NOT_FOUND');
  }

  // Delete from Cloudinary
  await deleteImageFromStorage(image.publicId);

  // Delete from database
  await prisma.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });

    // If deleted image was primary, make the first remaining image primary
    if (image.isPrimary) {
      const remaining = await tx.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (remaining) {
        await tx.productImage.update({
          where: { id: remaining.id },
          data: { isPrimary: true },
        });
      }
    }
  });

  await recordProductAuditLog({
    adminUser,
    action: 'PRODUCT_IMAGE_REMOVED',
    productId,
    ipAddress,
    changesSummary: `Removed image from product "${product.name}" [${product.itemCode}]`,
  });

  return { success: true, message: 'Product image removed successfully' };
}

/**
 * Set an image as the primary image for a product
 */
export async function setPrimaryProductImage(productId, imageId, adminUser = null, ipAddress = null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, itemCode: true },
  });

  if (!product) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId },
  });

  if (!image) {
    throw ApiError.notFound('Product image not found or does not belong to this product', 'IMAGE_NOT_FOUND');
  }

  const updatedImage = await prisma.$transaction(async (tx) => {
    await tx.productImage.updateMany({
      where: { productId },
      data: { isPrimary: false },
    });

    return tx.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
  });

  await recordProductAuditLog({
    adminUser,
    action: 'PRODUCT_PRIMARY_IMAGE_CHANGED',
    productId,
    ipAddress,
    changesSummary: `Set primary image for product "${product.name}" [${product.itemCode}]`,
  });

  return {
    ...updatedImage,
    thumbnailUrl: generateDeliveryUrl(updatedImage.publicId, { width: 200, height: 200, crop: 'fill' }),
  };
}

/**
 * Reorder images for a product
 */
export async function reorderProductImages(productId, imageIds = [], adminUser = null, ipAddress = null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, itemCode: true },
  });

  if (!product) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  const existingImages = await prisma.productImage.findMany({
    where: { productId },
    select: { id: true },
  });

  const existingIds = new Set(existingImages.map((img) => img.id));
  for (const imgId of imageIds) {
    if (!existingIds.has(imgId)) {
      throw ApiError.badRequest(`Image ID '${imgId}' does not belong to product '${productId}'`, 'INVALID_IMAGE_ID');
    }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < imageIds.length; i++) {
      await tx.productImage.update({
        where: { id: imageIds[i] },
        data: { sortOrder: i },
      });
    }
  });

  const reordered = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: 'asc' },
  });

  return reordered.map((img) => ({
    ...img,
    thumbnailUrl: generateDeliveryUrl(img.publicId, { width: 200, height: 200, crop: 'fill' }),
  }));
}
