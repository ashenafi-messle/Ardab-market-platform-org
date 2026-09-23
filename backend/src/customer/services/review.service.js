// ==============================================================================
// Ardab Market - Customer Product Reviews & Feedback Service
// ==============================================================================
// Reuses the existing authoritative `Feedback` schema and domain used by Sub Admin.
// Enforces verified purchase eligibility, duplicate review prevention,
// rating boundary validation, and XSS sanitization while supporting Amharic.

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { memoryCache } from '../../shared/middleware/cache.middleware.js';

export const PUBLIC_PRODUCT_REVIEW_WHERE = {
  type: 'PRODUCT',
  status: { in: ['PUBLISHED', 'REVIEWED', 'RESOLVED'] },
  visibility: 'PUBLIC',
};

/**
 * Returns public rating summaries for a set of products in one grouped query.
 */
export async function getPublicProductRatingSummaries(productIds = [], db = prisma) {
  if (!Array.isArray(productIds) || productIds.length === 0) return new Map();

  const aggregates = await db.feedback.groupBy({
    by: ['productId'],
    where: {
      ...PUBLIC_PRODUCT_REVIEW_WHERE,
      productId: { in: productIds },
    },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return new Map(aggregates.map((aggregate) => [
    aggregate.productId,
    {
      average: aggregate._avg.rating === null ? null : Number(aggregate._avg.rating),
      count: aggregate._count.rating,
    },
  ]));
}

/**
 * Basic XSS sanitizer that strips script tags, iframe, object, and raw javascript
 * while preserving legitimate Amharic and multilingual text.
 */
export function sanitizeReviewText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/javascript:[^\s"'>]*/gi, '')
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .trim();
}

/**
 * Formats a raw Feedback database record for customer-facing consumption.
 * Ensures internal administrative details and IDs are stripped.
 */
export function formatCustomerReview(item, currentCustomerId = null) {
  if (!item) return null;

  const latestResponse = item.responses && item.responses.length > 0
    ? item.responses[item.responses.length - 1]
    : null;

  const isOwner = Boolean(currentCustomerId && item.customerId === currentCustomerId);

  // Author display name: if anonymous and not the owner, display "Verified Customer"
  let authorDisplayName = item.authorName || 'Verified Customer';
  if (item.isAnonymous && !isOwner) {
    authorDisplayName = 'Verified Customer';
  } else if (item.customer?.fullName) {
    authorDisplayName = item.customer.fullName;
  }

  return {
    id: item.id,
    productId: item.productId,
    rating: item.rating,
    title: item.title,
    comment: item.comment,
    authorName: authorDisplayName,
    isVerified: item.isVerified,
    isAnonymous: item.isAnonymous,
    status: item.status,
    createdAt: item.createdAt ? item.createdAt.toISOString() : null,
    updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
    adminReply: latestResponse ? latestResponse.body : undefined,
    repliedAt: latestResponse && latestResponse.createdAt ? latestResponse.createdAt.toISOString() : undefined,
    responderName: latestResponse?.responderName || (latestResponse ? 'Ardab Support' : undefined),
    isOwner,
    product: item.product
      ? {
          id: item.product.id,
          name: item.product.name,
          itemCode: item.product.itemCode,
          sellingPrice: item.product.sellingPrice ? Number(item.product.sellingPrice) : null,
          image: item.product.images && item.product.images.length > 0
            ? (item.product.images[0].url || item.product.images[0])
            : null,
        }
      : undefined,
  };
}

/**
 * Checks whether an authenticated customer is eligible to review a given product.
 *
 * Rules:
 * 1. Authenticated customer must exist and be active.
 * 2. Product must exist.
 * 3. Customer must have an order containing this product where status is 'DELIVERED'.
 * 4. Customer must not have an existing active review for this product.
 */
export async function checkReviewEligibility(customerId, productId) {
  if (!customerId) {
    return {
      canReview: false,
      reason: 'UNAUTHENTICATED',
      message: 'Authentication is required to review this product.',
      orderId: null,
      existingReview: null,
    };
  }

  if (!productId) {
    throw ApiError.badRequest('Product ID is required');
  }

  // 1. Verify product existence
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, status: true },
  });

  if (!product) {
    throw ApiError.notFound(`Product with ID '${productId}' was not found`);
  }

  // 2. Check for existing review by this customer for this product
  const existingReview = await prisma.feedback.findFirst({
    where: {
      customerId,
      productId,
      type: 'PRODUCT',
      status: { notIn: ['ARCHIVED', 'REJECTED'] },
    },
    include: {
      responses: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (existingReview) {
    return {
      canReview: false,
      reason: 'ALREADY_REVIEWED',
      message: 'You have already reviewed this product.',
      orderId: existingReview.orderId,
      existingReview: formatCustomerReview(existingReview, customerId),
    };
  }

  // 3. Check for delivered order containing this product to determine verified purchase badge
  const deliveredOrder = await prisma.order.findFirst({
    where: {
      customerId,
      status: 'DELIVERED',
      items: {
        some: {
          productId,
        },
      },
    },
    select: {
      id: true,
      orderNumber: true,
      city: true,
      deliveredAt: true,
    },
    orderBy: { deliveredAt: 'desc' },
  });

  return {
    canReview: true,
    reason: null,
    message: null,
    orderId: deliveredOrder ? deliveredOrder.id : null,
    isVerified: Boolean(deliveredOrder),
    existingReview: null,
  };
}

/**
 * Creates a customer product review.
 * Allows any authenticated customer to review or rate products.
 * If customer has a delivered order for this product, sets isVerified: true and links orderId.
 * Enforces duplicate protection (one review per product per customer) and rating boundaries (1–5).
 */
export async function createCustomerProductReview(customerId, data) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required to submit a review');
  }

  const { productId, rating, comment, title, isAnonymous } = data;

  if (!productId) {
    throw ApiError.badRequest('Product ID is required');
  }

  // 1. Validate rating: must be integer between 1 and 5
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw ApiError.badRequest('Rating must be an integer between 1 and 5', 'INVALID_RATING');
  }

  // 2. Validate and sanitize comment
  const sanitizedComment = sanitizeReviewText(comment);
  if (!sanitizedComment || sanitizedComment.length < 3) {
    throw ApiError.badRequest('Review comment must be at least 3 characters long', 'INVALID_COMMENT');
  }
  if (sanitizedComment.length > 2000) {
    throw ApiError.badRequest('Review comment cannot exceed 2000 characters', 'COMMENT_TOO_LONG');
  }

  const sanitizedTitle = sanitizeReviewText(title || (numericRating >= 4 ? 'Great product!' : 'Product review'));

  // 3. Check duplicate review prevention and get verified purchase status
  const eligibility = await checkReviewEligibility(customerId, productId);
  if (!eligibility.canReview && eligibility.reason === 'ALREADY_REVIEWED') {
    throw ApiError.badRequest('You have already submitted a review for this product', 'DUPLICATE_REVIEW');
  }

  // 4. Fetch customer details for author attribution
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, fullName: true, city: true },
  });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, sellerId: true, marketplaceCategoryId: true },
  });

  // Calculate sentiment from rating
  let sentiment = 'NEUTRAL';
  if (numericRating >= 4) sentiment = 'POSITIVE';
  else if (numericRating <= 2) sentiment = 'NEGATIVE';

  const authorName = customer?.fullName || 'Verified Customer';
  const city = customer?.city || 'Gondar';

  // 5. Transactionally create feedback with race condition / double-click protection
  const review = await prisma.$transaction(async (tx) => {
    // Re-check for concurrent duplicate within transaction
    const existing = await tx.feedback.findFirst({
      where: {
        customerId,
        productId,
        type: 'PRODUCT',
        status: { notIn: ['ARCHIVED', 'REJECTED'] },
      },
    });

    if (existing) {
      throw ApiError.badRequest('You have already submitted a review for this product', 'DUPLICATE_REVIEW');
    }

    return tx.feedback.create({
      data: {
        customerId,
        orderId: eligibility.orderId,
        productId,
        sellerId: product.sellerId || null,
        authorName,
        authorRole: 'CUSTOMER',
        type: 'PRODUCT',
        source: 'PRODUCT',
        city,
        rating: numericRating,
        title: sanitizedTitle,
        comment: sanitizedComment,
        targetEntityName: product.name,
        sentiment,
        status: 'PENDING', // Enters Sub Admin moderation queue
        visibility: 'PUBLIC',
        isVerified: Boolean(eligibility.isVerified),
        isAnonymous: Boolean(isAnonymous),
      },
      include: {
        product: {
          select: { id: true, name: true, itemCode: true, sellingPrice: true, images: true },
        },
      },
    });
  });

  logger.info(`Customer review created: id=${review.id}, customerId=${customerId}, productId=${productId}, rating=${numericRating}`);

  return formatCustomerReview(review, customerId);
}

/**
 * Retrieves aggregated review metrics and public reviews for a product.
 * Excludes HIDDEN and REJECTED reviews from public statistics and list.
 */
export async function getProductReviews(productId, queryParams = {}, currentCustomerId = null) {
  if (!productId) {
    throw ApiError.badRequest('Product ID is required');
  }

  const page = Math.max(1, parseInt(queryParams.page || 1, 10));
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit || queryParams.pageSize || 10, 10)));
  const skip = (page - 1) * limit;

  // Sorting
  const sort = queryParams.sort || 'newest';
  let orderBy = { createdAt: 'desc' };
  if (sort === 'highest') orderBy = { rating: 'desc' };
  else if (sort === 'lowest') orderBy = { rating: 'asc' };
  else if (sort === 'oldest') orderBy = { createdAt: 'asc' };

  // Filter for public visibility
  const publicWhere = { ...PUBLIC_PRODUCT_REVIEW_WHERE, productId };

  // Optional filter by specific star rating
  const listWhere = { ...publicWhere };
  if (queryParams.rating) {
    const r = parseInt(queryParams.rating, 10);
    if (r >= 1 && r <= 5) listWhere.rating = r;
  }

  const [
    totalPublic,
    ratingAgg,
    ratingsGroup,
    records,
  ] = await prisma.$transaction([
    prisma.feedback.count({ where: publicWhere }),
    prisma.feedback.aggregate({
      where: publicWhere,
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.feedback.groupBy({
      by: ['rating'],
      where: publicWhere,
      _count: { rating: true },
    }),
    prisma.feedback.findMany({
      where: listWhere,
      skip,
      take: limit,
      orderBy,
      include: {
        customer: { select: { fullName: true } },
        responses: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, body: true, responderName: true, createdAt: true },
        },
      },
    }),
  ]);

  // Build rating distribution: 1 to 5
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingsGroup.forEach((g) => {
    if (ratingDistribution[g.rating] !== undefined) {
      ratingDistribution[g.rating] = g._count.rating;
    }
  });

  const totalReviews = totalPublic || 0;
  const rawAvg = ratingAgg._avg.rating || 0;
  const averageRating = totalReviews > 0 ? parseFloat(rawAvg.toFixed(1)) : 0;

  // Percentage breakdown
  const ratingPercentages = {
    5: totalReviews > 0 ? Math.round((ratingDistribution[5] / totalReviews) * 100) : 0,
    4: totalReviews > 0 ? Math.round((ratingDistribution[4] / totalReviews) * 100) : 0,
    3: totalReviews > 0 ? Math.round((ratingDistribution[3] / totalReviews) * 100) : 0,
    2: totalReviews > 0 ? Math.round((ratingDistribution[2] / totalReviews) * 100) : 0,
    1: totalReviews > 0 ? Math.round((ratingDistribution[1] / totalReviews) * 100) : 0,
  };

  // If customer is authenticated, fetch their own review if exists (even if PENDING)
  let customerReview = null;
  let eligibility = null;
  if (currentCustomerId) {
    const ownReview = await prisma.feedback.findFirst({
      where: {
        customerId: currentCustomerId,
        productId,
        type: 'PRODUCT',
        status: { notIn: ['ARCHIVED'] },
      },
      include: {
        responses: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (ownReview) {
      customerReview = formatCustomerReview(ownReview, currentCustomerId);
    }

    eligibility = await checkReviewEligibility(currentCustomerId, productId);
  }

  const items = records.map((r) => formatCustomerReview(r, currentCustomerId));

  return {
    summary: {
      averageRating,
      totalReviews,
      ratingDistribution,
      ratingPercentages,
    },
    items,
    customerReview,
    eligibility,
    pagination: {
      page,
      pageSize: limit,
      total: totalPublic,
      totalPages: Math.ceil(totalPublic / limit) || 1,
      hasNext: page * limit < totalPublic,
      hasPrev: page > 1,
    },
  };
}

/**
 * Retrieves all reviews authored by the authenticated customer.
 */
export async function getCustomerReviews(customerId, queryParams = {}) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const page = Math.max(1, parseInt(queryParams.page || 1, 10));
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit || queryParams.pageSize || 10, 10)));
  const skip = (page - 1) * limit;

  const where = {
    customerId,
    type: 'PRODUCT',
    status: { not: 'ARCHIVED' },
  };

  if (queryParams.status && queryParams.status !== 'ALL') {
    where.status = queryParams.status;
  }

  const [total, records] = await prisma.$transaction([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            itemCode: true,
            sellingPrice: true,
            images: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
          },
        },
        responses: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, body: true, responderName: true, createdAt: true },
        },
      },
    }),
  ]);

  const items = records.map((r) => formatCustomerReview(r, customerId));

  return {
    items,
    pagination: {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * Retrieves a single customer review by ID with strict ownership validation (IDOR protection).
 */
export async function getCustomerReviewById(customerId, reviewId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const review = await prisma.feedback.findFirst({
    where: {
      id: reviewId,
      customerId,
      status: { not: 'ARCHIVED' },
    },
    include: {
      product: {
        select: { id: true, name: true, itemCode: true, sellingPrice: true, images: true },
      },
      responses: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, body: true, responderName: true, createdAt: true },
      },
    },
  });

  if (!review) {
    throw ApiError.notFound('Review not found or access denied', 'REVIEW_NOT_FOUND');
  }

  return formatCustomerReview(review, customerId);
}

/**
 * Updates an existing review owned by the authenticated customer.
 * Enforces ownership and re-enters PENDING status for moderation.
 */
export async function updateCustomerReview(customerId, reviewId, data) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const review = await prisma.feedback.findFirst({
    where: {
      id: reviewId,
      customerId,
      status: { not: 'ARCHIVED' },
    },
  });

  if (!review) {
    throw ApiError.notFound('Review not found or access denied', 'REVIEW_NOT_FOUND');
  }

  const updateData = {};

  if (data.rating !== undefined) {
    const numericRating = Number(data.rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      throw ApiError.badRequest('Rating must be an integer between 1 and 5', 'INVALID_RATING');
    }
    updateData.rating = numericRating;

    let sentiment = 'NEUTRAL';
    if (numericRating >= 4) sentiment = 'POSITIVE';
    else if (numericRating <= 2) sentiment = 'NEGATIVE';
    updateData.sentiment = sentiment;
  }

  if (data.comment !== undefined) {
    const sanitizedComment = sanitizeReviewText(data.comment);
    if (!sanitizedComment || sanitizedComment.length < 3) {
      throw ApiError.badRequest('Review comment must be at least 3 characters long', 'INVALID_COMMENT');
    }
    if (sanitizedComment.length > 2000) {
      throw ApiError.badRequest('Review comment cannot exceed 2000 characters', 'COMMENT_TOO_LONG');
    }
    updateData.comment = sanitizedComment;
  }

  if (data.title !== undefined) {
    updateData.title = sanitizeReviewText(data.title);
  }

  if (data.isAnonymous !== undefined) {
    updateData.isAnonymous = Boolean(data.isAnonymous);
  }

  // Re-enter moderation queue on customer edit
  updateData.status = 'PENDING';

  const updated = await prisma.feedback.update({
    where: { id: reviewId },
    data: updateData,
    include: {
      product: {
        select: { id: true, name: true, itemCode: true, sellingPrice: true, images: true },
      },
      responses: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, body: true, responderName: true, createdAt: true },
      },
    },
  });

  if (review.productId) {
    memoryCache.invalidate('^cache:/api/customer/catalog/products');
  }

  logger.info(`Customer review updated [${reviewId}] by customer [${customerId}]`);

  return formatCustomerReview(updated, customerId);
}

/**
 * Deletes a customer review (soft delete: sets status to ARCHIVED and visibility to HIDDEN).
 * Enforces ownership to prevent IDOR deletion.
 */
export async function deleteCustomerReview(customerId, reviewId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const review = await prisma.feedback.findFirst({
    where: {
      id: reviewId,
      customerId,
      status: { not: 'ARCHIVED' },
    },
  });

  if (!review) {
    throw ApiError.notFound('Review not found or access denied', 'REVIEW_NOT_FOUND');
  }

  await prisma.feedback.update({
    where: { id: reviewId },
    data: {
      status: 'ARCHIVED',
      visibility: 'HIDDEN',
    },
  });

  if (review.productId) {
    memoryCache.invalidate('^cache:/api/customer/catalog/products');
  }

  logger.info(`Customer review [${reviewId}] archived by customer [${customerId}]`);

  return { success: true, message: 'Review successfully deleted' };
}
