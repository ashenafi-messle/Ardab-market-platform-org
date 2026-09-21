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
import { getDescendantCategoryIds, getCategoryPath } from './category.service.js';
import { resolveEffectiveCategoryAttributes } from './categoryAttribute.service.js';

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

  const formattedAttributeValues = (product.attributeValues || []).map((pav) => ({
    id: pav.id,
    attributeDefinitionId: pav.attributeDefinitionId,
    name: pav.attributeDefinition ? pav.attributeDefinition.name : null,
    slug: pav.attributeDefinition ? pav.attributeDefinition.slug : null,
    type: pav.attributeDefinition ? pav.attributeDefinition.type : null,
    unit: pav.attributeDefinition ? pav.attributeDefinition.unit : null,
    optionId: pav.optionId,
    optionLabel: pav.option ? pav.option.label : null,
    optionValue: pav.option ? pav.option.value : null,
    valueText: pav.valueText,
    valueNumber: pav.valueNumber !== null && pav.valueNumber !== undefined ? Number(pav.valueNumber) : null,
    valueBoolean: pav.valueBoolean,
    valueDate: pav.valueDate ? pav.valueDate.toISOString() : null,
  }));

  return {
    ...product,
    costPrice: product.costPrice !== null && product.costPrice !== undefined ? Number(product.costPrice) : null,
    sellingPrice: Number(product.sellingPrice),
    weight: product.weight !== null && product.weight !== undefined ? Number(product.weight) : null,
    images: formattedImages,
    primaryImage: formattedImages.find((img) => img.isPrimary) || formattedImages[0] || null,
    attributeValues: formattedAttributeValues,
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

  // Marketplace Category Filter (supports slug or UUID, and defaults to resolving all descendant categories)
  const categoryFilterParam = query.categoryId || query.category;
  if (categoryFilterParam && categoryFilterParam !== 'all') {
    const rawCat = categoryFilterParam.trim();
    let targetCatId = rawCat;

    // Check if rawCat is a slug or ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCat);
    if (!isUuid) {
      const foundCat = await prisma.marketplaceCategory.findUnique({
        where: { slug: rawCat.toLowerCase() },
        select: { id: true },
      });
      if (foundCat) {
        targetCatId = foundCat.id;
      }
    }

    // Default includeDescendants to TRUE for comprehensive category browsing unless explicitly 'false'
    const shouldIncludeDescendants = query.includeDescendants !== 'false' && query.includeDescendants !== false;
    if (shouldIncludeDescendants) {
      const descendants = await getDescendantCategoryIds(targetCatId);
      where.marketplaceCategoryId = { in: [targetCatId, ...descendants] };
    } else {
      where.marketplaceCategoryId = targetCatId;
    }
  }

  // Price Range Filtering
  if (query.minPrice !== undefined && query.minPrice !== '' && !isNaN(Number(query.minPrice))) {
    where.sellingPrice = { ...(where.sellingPrice || {}), gte: Number(query.minPrice) };
  }
  if (query.maxPrice !== undefined && query.maxPrice !== '' && !isNaN(Number(query.maxPrice))) {
    where.sellingPrice = { ...(where.sellingPrice || {}), lte: Number(query.maxPrice) };
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

  // Database-Level Sorting
  const sortParam = query.sort || query.sortBy || 'createdAt_desc';
  let orderBy = { createdAt: 'desc' };

  switch (sortParam) {
    case 'price_asc':
    case 'price:asc':
      orderBy = { sellingPrice: 'asc' };
      break;
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
    case 'popular':
    case 'newest':
    case 'createdAt_desc':
    default:
      orderBy = { createdAt: 'desc' };
      break;
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
      orderBy,
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
      attributeValues: {
        include: {
          attributeDefinition: true,
          option: true,
        },
      },
    },
  });

  if (!product) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  const formatted = formatProduct(product);
  if (product.marketplaceCategoryId) {
    formatted.categoryPath = await getCategoryPath(product.marketplaceCategoryId);
  } else {
    formatted.categoryPath = [];
  }

  return formatted;
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

  // 3. Category Logistics and Category Attributes Validation (Seller is allowable for any category)
  const effectiveConfig = await resolveEffectiveCategoryAttributes(data.marketplaceCategoryId);
  const { logistics, attributes: allowedAttributes } = effectiveConfig;

  // Logistics Enforcement: Unit of Measure
  let finalUnit = data.unit ? data.unit.trim() : null;
  if (logistics.unitOfMeasureMode === 'REQUIRED' && (!finalUnit || finalUnit.length === 0)) {
    throw ApiError.badRequest(
      `Unit of measure is required for products in category '${category.name}'`,
      'UNIT_OF_MEASURE_REQUIRED'
    );
  }
  if (logistics.unitOfMeasureMode === 'NOT_USED') {
    finalUnit = null; // Do not persist misleading UOM
  }

  // Logistics Enforcement: Weight
  let finalWeight = data.weight !== undefined && data.weight !== null ? data.weight : null;
  if (logistics.weightMode === 'REQUIRED' && (finalWeight === null || finalWeight <= 0)) {
    throw ApiError.badRequest(
      `Product unit weight is required and must be greater than 0 for category '${category.name}'`,
      'WEIGHT_REQUIRED'
    );
  }
  if (logistics.weightMode === 'NOT_USED') {
    finalWeight = null; // Do not persist misleading weight
  }

  // Category Attributes Validation
  const allowedAttrMap = new Map(allowedAttributes.map((a) => [a.id, a]));
  const incomingValues = Array.isArray(data.attributeValues) ? data.attributeValues : [];

  // Check required attributes
  for (const attr of allowedAttributes) {
    if (attr.isRequired) {
      const found = incomingValues.filter((v) => v.attributeDefinitionId === attr.id);
      const hasValue = found.some((v) => {
        if (attr.type === 'SELECT' || attr.type === 'MULTI_SELECT') return !!v.optionId;
        if (attr.type === 'TEXT') return v.valueText && v.valueText.trim().length > 0;
        if (attr.type === 'NUMBER') return v.valueNumber !== null && v.valueNumber !== undefined && !isNaN(Number(v.valueNumber));
        if (attr.type === 'BOOLEAN') return v.valueBoolean !== null && v.valueBoolean !== undefined;
        if (attr.type === 'DATE') return !!v.valueDate;
        return false;
      });

      if (!hasValue) {
        throw ApiError.badRequest(
          `Required category attribute '${attr.name}' is missing`,
          'ATTRIBUTE_REQUIRED'
        );
      }
    }
  }

  // Validate incoming values against definitions
  const preparedAttrRecords = [];
  for (const val of incomingValues) {
    if (!val.attributeDefinitionId) continue;
    const def = allowedAttrMap.get(val.attributeDefinitionId);
    if (!def) {
      throw ApiError.badRequest(
        `Attribute '${val.attributeDefinitionId}' is not allowed for category '${category.name}'`,
        'ATTRIBUTE_NOT_ALLOWED'
      );
    }

    if (def.type === 'SELECT' || def.type === 'MULTI_SELECT') {
      if (val.optionId) {
        const optionExists = def.options.some((o) => o.id === val.optionId);
        if (!optionExists) {
          throw ApiError.badRequest(
            `Invalid option selected for attribute '${def.name}'`,
            'INVALID_ATTRIBUTE_OPTION'
          );
        }
        preparedAttrRecords.push({
          attributeDefinitionId: def.id,
          optionId: val.optionId,
          valueText: null,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
        });
      }
    } else if (def.type === 'TEXT') {
      if (val.valueText !== undefined && val.valueText !== null && val.valueText.trim().length > 0) {
        preparedAttrRecords.push({
          attributeDefinitionId: def.id,
          optionId: null,
          valueText: val.valueText.trim(),
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
        });
      }
    } else if (def.type === 'NUMBER') {
      if (val.valueNumber !== undefined && val.valueNumber !== null && !isNaN(Number(val.valueNumber))) {
        preparedAttrRecords.push({
          attributeDefinitionId: def.id,
          optionId: null,
          valueText: null,
          valueNumber: Number(val.valueNumber),
          valueBoolean: null,
          valueDate: null,
        });
      }
    } else if (def.type === 'BOOLEAN') {
      if (val.valueBoolean !== undefined && val.valueBoolean !== null) {
        preparedAttrRecords.push({
          attributeDefinitionId: def.id,
          optionId: null,
          valueText: null,
          valueNumber: null,
          valueBoolean: Boolean(val.valueBoolean),
          valueDate: null,
        });
      }
    } else if (def.type === 'DATE') {
      if (val.valueDate) {
        const d = new Date(val.valueDate);
        if (isNaN(d.getTime())) {
          throw ApiError.badRequest(`Invalid date format for attribute '${def.name}'`, 'INVALID_DATE_FORMAT');
        }
        preparedAttrRecords.push({
          attributeDefinitionId: def.id,
          optionId: null,
          valueText: null,
          valueNumber: null,
          valueBoolean: null,
          valueDate: d,
        });
      }
    }
  }

  // 5. Upload Images to Cloudinary before database transaction
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

  // 6. Atomic Product Creation + Item Code Generation in Transaction with Compensating Cleanup
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
          unit: finalUnit,
          weight: finalWeight,
          costPrice: data.costPrice !== undefined && data.costPrice !== null ? data.costPrice : null,
          sellingPrice: data.sellingPrice,
          status: data.status || 'ACTIVE',
          cityAvailability: Array.isArray(data.cityAvailability) && data.cityAvailability.length > 0
            ? data.cityAvailability
            : ['All Cities'],
          images: imageRecordsToCreate.length > 0
            ? { create: imageRecordsToCreate }
            : undefined,
          attributeValues: preparedAttrRecords.length > 0
            ? { create: preparedAttrRecords }
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
          attributeValues: {
            include: {
              attributeDefinition: true,
              option: true,
            },
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
    attributesCount: preparedAttrRecords.length,
  });

  // 7. Record Audit Log
  await recordProductAuditLog({
    adminUser,
    action: 'PRODUCT_CREATED',
    productId: product.id,
    ipAddress,
    changesSummary: `Created product "${product.name}" with item code [${product.itemCode}] under seller "${product.seller.companyName}" with ${imageRecordsToCreate.length} image(s) and ${preparedAttrRecords.length} attribute value(s)`,
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
      attributeValues: true,
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
  }

  // Resolve Effective Category Configuration for target category
  const effectiveConfig = await resolveEffectiveCategoryAttributes(targetCategoryId);
  const { logistics, attributes: allowedAttributes } = effectiveConfig;

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) {
    updateData.description = data.description ? data.description.trim() : null;
  }
  if (data.sellerId !== undefined) updateData.sellerId = data.sellerId;
  if (data.marketplaceCategoryId !== undefined) updateData.marketplaceCategoryId = data.marketplaceCategoryId;

  // Validate & Assign Logistics: Unit of Measure
  if (data.unit !== undefined || data.marketplaceCategoryId !== undefined) {
    let targetUnit = data.unit !== undefined ? (data.unit ? data.unit.trim() : null) : existing.unit;
    if (logistics.unitOfMeasureMode === 'REQUIRED' && (!targetUnit || targetUnit.length === 0)) {
      throw ApiError.badRequest(
        `Unit of measure is required for products in category '${existing.category?.name || 'selected'}'`,
        'UNIT_OF_MEASURE_REQUIRED'
      );
    }
    if (logistics.unitOfMeasureMode === 'NOT_USED') {
      targetUnit = null;
    }
    updateData.unit = targetUnit;
  }

  // Validate & Assign Logistics: Weight
  if (data.weight !== undefined || data.marketplaceCategoryId !== undefined) {
    let targetWeight = data.weight !== undefined ? data.weight : (existing.weight !== null ? Number(existing.weight) : null);
    if (logistics.weightMode === 'REQUIRED' && (targetWeight === null || targetWeight <= 0)) {
      throw ApiError.badRequest(
        `Product unit weight is required and must be greater than 0 for category '${existing.category?.name || 'selected'}'`,
        'WEIGHT_REQUIRED'
      );
    }
    if (logistics.weightMode === 'NOT_USED') {
      targetWeight = null;
    }
    updateData.weight = targetWeight;
  }

  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
  if (data.sellingPrice !== undefined) updateData.sellingPrice = data.sellingPrice;
  if (data.cityAvailability !== undefined) updateData.cityAvailability = data.cityAvailability;
  if (data.status !== undefined) updateData.status = data.status;

  // Attribute Values Validation & Preparation if provided or if category changed
  let shouldUpdateAttributes = false;
  let preparedAttrRecords = [];

  if (Array.isArray(data.attributeValues)) {
    shouldUpdateAttributes = true;
    const allowedAttrMap = new Map(allowedAttributes.map((a) => [a.id, a]));
    const incomingValues = data.attributeValues;

    // Validate required attributes
    for (const attr of allowedAttributes) {
      if (attr.isRequired) {
        const found = incomingValues.filter((v) => v.attributeDefinitionId === attr.id);
        const hasValue = found.some((v) => {
          if (attr.type === 'SELECT' || attr.type === 'MULTI_SELECT') return !!v.optionId;
          if (attr.type === 'TEXT') return v.valueText && v.valueText.trim().length > 0;
          if (attr.type === 'NUMBER') return v.valueNumber !== null && v.valueNumber !== undefined && !isNaN(Number(v.valueNumber));
          if (attr.type === 'BOOLEAN') return v.valueBoolean !== null && v.valueBoolean !== undefined;
          if (attr.type === 'DATE') return !!v.valueDate;
          return false;
        });

        if (!hasValue) {
          throw ApiError.badRequest(
            `Required category attribute '${attr.name}' is missing`,
            'ATTRIBUTE_REQUIRED'
          );
        }
      }
    }

    for (const val of incomingValues) {
      if (!val.attributeDefinitionId) continue;
      const def = allowedAttrMap.get(val.attributeDefinitionId);
      if (!def) {
        throw ApiError.badRequest(
          `Attribute '${val.attributeDefinitionId}' is not allowed for the selected category`,
          'ATTRIBUTE_NOT_ALLOWED'
        );
      }

      if (def.type === 'SELECT' || def.type === 'MULTI_SELECT') {
        if (val.optionId) {
          const optionExists = def.options.some((o) => o.id === val.optionId);
          if (!optionExists) {
            throw ApiError.badRequest(
              `Invalid option selected for attribute '${def.name}'`,
              'INVALID_ATTRIBUTE_OPTION'
            );
          }
          preparedAttrRecords.push({
            productId: id,
            attributeDefinitionId: def.id,
            optionId: val.optionId,
            valueText: null,
            valueNumber: null,
            valueBoolean: null,
            valueDate: null,
          });
        }
      } else if (def.type === 'TEXT') {
        if (val.valueText !== undefined && val.valueText !== null && val.valueText.trim().length > 0) {
          preparedAttrRecords.push({
            productId: id,
            attributeDefinitionId: def.id,
            optionId: null,
            valueText: val.valueText.trim(),
            valueNumber: null,
            valueBoolean: null,
            valueDate: null,
          });
        }
      } else if (def.type === 'NUMBER') {
        if (val.valueNumber !== undefined && val.valueNumber !== null && !isNaN(Number(val.valueNumber))) {
          preparedAttrRecords.push({
            productId: id,
            attributeDefinitionId: def.id,
            optionId: null,
            valueText: null,
            valueNumber: Number(val.valueNumber),
            valueBoolean: null,
            valueDate: null,
          });
        }
      } else if (def.type === 'BOOLEAN') {
        if (val.valueBoolean !== undefined && val.valueBoolean !== null) {
          preparedAttrRecords.push({
            productId: id,
            attributeDefinitionId: def.id,
            optionId: null,
            valueText: null,
            valueNumber: null,
            valueBoolean: Boolean(val.valueBoolean),
            valueDate: null,
          });
        }
      } else if (def.type === 'DATE') {
        if (val.valueDate) {
          const d = new Date(val.valueDate);
          if (isNaN(d.getTime())) {
            throw ApiError.badRequest(`Invalid date format for attribute '${def.name}'`, 'INVALID_DATE_FORMAT');
          }
          preparedAttrRecords.push({
            productId: id,
            attributeDefinitionId: def.id,
            optionId: null,
            valueText: null,
            valueNumber: null,
            valueBoolean: null,
            valueDate: d,
          });
        }
      }
    }
  } else if (data.marketplaceCategoryId && data.marketplaceCategoryId !== existing.marketplaceCategoryId) {
    // If category changed and no attributes were supplied, clean up existing attributes incompatible with new category
    shouldUpdateAttributes = true;
    preparedAttrRecords = [];
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (shouldUpdateAttributes) {
      await tx.productAttributeValue.deleteMany({
        where: { productId: id },
      });
      if (preparedAttrRecords.length > 0) {
        await tx.productAttributeValue.createMany({
          data: preparedAttrRecords,
        });
      }
    }

    return tx.product.update({
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
        attributeValues: {
          include: {
            attributeDefinition: true,
            option: true,
          },
        },
      },
    });
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
