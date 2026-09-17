// ==============================================================================
// Ardab Market - Feedback & Reputation Management Service Layer
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Format feedback record for frontend presentation.
 * Maps relation responses to legacy `adminReply` and `repliedAt` for seamless UI display.
 */
function formatFeedbackItem(item) {
  if (!item) return null;
  const latestResponse = item.responses && item.responses.length > 0
    ? item.responses[item.responses.length - 1]
    : null;

  return {
    ...item,
    adminReply: latestResponse ? latestResponse.body : undefined,
    repliedAt: latestResponse ? latestResponse.createdAt.toISOString() : undefined,
    targetEntityName:
      item.targetEntityName ||
      (item.product ? item.product.name : item.seller ? item.seller.companyName : item.delivery ? item.delivery.deliveryNumber : 'Ardab Platform'),
  };
}

/**
 * List feedback items with search, multi-factor filtering, and server-side pagination.
 */
export async function listFeedback(queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit || queryParams.pageSize || 20, 10)));
  const skip = (page - 1) * limit;

  const where = {};

  // City filtering
  if (queryParams.city && queryParams.city !== 'All Cities') {
    where.city = queryParams.city;
  }

  // Type filtering
  if (queryParams.type && queryParams.type !== 'ALL') {
    where.type = queryParams.type;
  }

  // Source filtering
  if (queryParams.source && queryParams.source !== 'ALL') {
    where.source = queryParams.source;
  }

  // Status filtering
  if (queryParams.status && queryParams.status !== 'ALL') {
    where.status = queryParams.status;
  }

  // Numeric Rating filtering (1 - 5)
  if (queryParams.rating) {
    where.rating = parseInt(queryParams.rating, 10);
  }

  // Category filtering
  if (queryParams.category && queryParams.category !== 'ALL') {
    where.OR = [
      { categoryId: queryParams.category },
      { category: { name: { contains: queryParams.category, mode: 'insensitive' } } },
    ];
  }

  // Verified filter
  if (queryParams.verified !== undefined) {
    where.isVerified = queryParams.verified === true || queryParams.verified === 'true';
  }

  // Specific entity relation filtering
  if (queryParams.entityType && queryParams.entityId) {
    const typeUpper = queryParams.entityType.toUpperCase();
    if (typeUpper === 'PRODUCT') where.productId = queryParams.entityId;
    else if (typeUpper === 'SELLER' || typeUpper === 'SUPPLIER') where.sellerId = queryParams.entityId;
    else if (typeUpper === 'DELIVERY') where.deliveryId = queryParams.entityId;
    else if (typeUpper === 'CUSTOMER') where.customerId = queryParams.entityId;
  }

  // Date range filtering
  if (queryParams.dateFrom || queryParams.dateTo) {
    where.createdAt = {};
    if (queryParams.dateFrom) where.createdAt.gte = new Date(queryParams.dateFrom);
    if (queryParams.dateTo) where.createdAt.lte = new Date(queryParams.dateTo);
  }

  // Full-text / substring search across multiple relevant fields
  if (queryParams.search && queryParams.search.trim()) {
    const term = queryParams.search.trim();
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { authorName: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { comment: { contains: term, mode: 'insensitive' } },
        { targetEntityName: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { customer: { fullName: { contains: term, mode: 'insensitive' } } },
        { product: { name: { contains: term, mode: 'insensitive' } } },
        { seller: { companyName: { contains: term, mode: 'insensitive' } } },
      ],
    });
  }

  const orderBy = {};
  const validSortFields = ['createdAt', 'updatedAt', 'rating', 'status', 'publishedAt'];
  const sortField = validSortFields.includes(queryParams.sortBy) ? queryParams.sortBy : 'createdAt';
  const sortOrder = queryParams.sortOrder === 'asc' ? 'asc' : 'desc';
  orderBy[sortField] = sortOrder;

  const [total, items] = await prisma.$transaction([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        category: true,
        customer: {
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            email: true,
            phone: true,
            city: true,
          },
        },
        product: {
          select: {
            id: true,
            itemCode: true,
            name: true,
            sellingPrice: true,
          },
        },
        seller: {
          select: {
            id: true,
            companyName: true,
            name: true,
            phone: true,
            city: true,
          },
        },
        delivery: {
          select: {
            id: true,
            deliveryNumber: true,
            status: true,
          },
        },
        responses: {
          orderBy: { createdAt: 'asc' },
          include: {
            responder: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            reports: true,
            responses: true,
          },
        },
      },
    }),
  ]);

  return {
    items: items.map(formatFeedbackItem),
    pagination: {
      page,
      limit,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieve comprehensive feedback details with complete audit trails, reports, and response history.
 */
export async function getFeedbackById(id) {
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      category: true,
      customer: {
        select: {
          id: true,
          customerCode: true,
          fullName: true,
          email: true,
          phone: true,
          city: true,
          status: true,
          verificationStatus: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          placedAt: true,
          city: true,
        },
      },
      product: {
        select: {
          id: true,
          itemCode: true,
          name: true,
          unit: true,
          sellingPrice: true,
          status: true,
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
      delivery: {
        select: {
          id: true,
          deliveryNumber: true,
          status: true,
          scheduledAt: true,
          deliveredAt: true,
        },
      },
      responses: {
        orderBy: { createdAt: 'asc' },
        include: {
          responder: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      reports: {
        orderBy: { createdAt: 'desc' },
        include: {
          reviewedBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
      moderationHistory: {
        orderBy: { createdAt: 'desc' },
        include: {
          moderator: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        include: {
          changedBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!feedback) {
    throw ApiError.notFound(`Feedback with ID '${id}' not found`, 'FEEDBACK_NOT_FOUND');
  }

  return formatFeedbackItem(feedback);
}

/**
 * Authoritative creation of a feedback entry with verified relationship validation.
 */
export async function createFeedback(data) {
  let isVerified = false;

  // Server-side verification rule:
  // Legitimate relation exists between Customer and Order/Product/Seller/Delivery
  if (data.customerId && data.orderId) {
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        customerId: data.customerId,
      },
      include: {
        items: true,
      },
    });

    if (order) {
      const isCompletedOrder = ['DELIVERED', 'CONFIRMED', 'COMPLETED', 'PICKED_UP'].includes(order.status);
      if (isCompletedOrder) {
        if (!data.productId) {
          isVerified = true;
        } else {
          // If referencing a specific product, verify the product was purchased in this order
          isVerified = order.items.some((item) => item.productId === data.productId);
        }
      }
    }
  }

  // Derive sentiment from rating
  let sentiment = 'NEUTRAL';
  if (data.rating >= 4) sentiment = 'POSITIVE';
  else if (data.rating <= 2) sentiment = 'NEGATIVE';

  const feedback = await prisma.feedback.create({
    data: {
      customerId: data.customerId || null,
      authorName: data.authorName,
      authorRole: data.authorRole || 'CUSTOMER',
      orderId: data.orderId || null,
      productId: data.productId || null,
      sellerId: data.sellerId || null,
      deliveryId: data.deliveryId || null,
      categoryId: data.categoryId || null,
      type: data.type || 'PLATFORM',
      source: data.source || 'PLATFORM',
      city: data.city || 'Gondar',
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      targetEntityName: data.targetEntityName || null,
      sentiment,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      isVerified,
      isAnonymous: data.isAnonymous || false,
      publishedAt: new Date(),
    },
    include: {
      category: true,
      customer: true,
      product: true,
      seller: true,
    },
  });

  logger.info(`Feedback created [${feedback.id}] rating=${feedback.rating} isVerified=${isVerified}`, {
    feedbackId: feedback.id,
    rating: feedback.rating,
    isVerified,
  });

  return formatFeedbackItem(feedback);
}

/**
 * Publish an official subadmin/admin response to a feedback entry.
 */
export async function respondToFeedback(feedbackId, responseData, adminUser) {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: { responses: true },
  });

  if (!feedback) {
    throw ApiError.notFound(`Feedback with ID '${feedbackId}' not found`, 'FEEDBACK_NOT_FOUND');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the response record
    const response = await tx.feedbackResponse.create({
      data: {
        feedbackId,
        responderId: adminUser?.id || null,
        responderType: adminUser?.role === 'SUPER_ADMIN' ? 'ADMIN' : 'SUBADMIN',
        responderName: adminUser?.name || 'Ardab Sub Admin',
        body: responseData.body,
      },
    });

    // 2. Transition status to REVIEWED if currently NEW, PENDING, or PUBLISHED
    let newStatus = feedback.status;
    if (['NEW', 'PENDING', 'PUBLISHED'].includes(feedback.status)) {
      newStatus = 'REVIEWED';
      await tx.feedback.update({
        where: { id: feedbackId },
        data: { status: 'REVIEWED' },
      });

      await tx.feedbackStatusHistory.create({
        data: {
          feedbackId,
          changedById: adminUser?.id || null,
          oldStatus: feedback.status,
          newStatus: 'REVIEWED',
          reason: 'Official administrator response published',
        },
      });
    }

    return response;
  });

  logger.info(`Response published to feedback [${feedbackId}] by admin [${adminUser?.id}]`, {
    feedbackId,
    responderId: adminUser?.id,
  });

  return getFeedbackById(feedbackId);
}

/**
 * Apply atomic moderation actions: PUBLISH, HIDE, REJECT, RESOLVE, ARCHIVE, RESTORE.
 * Records audit trails in feedback_moderation_history and feedback_status_history.
 */
export async function moderateFeedback(feedbackId, { action, reason }, adminUser) {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
  });

  if (!feedback) {
    throw ApiError.notFound(`Feedback with ID '${feedbackId}' not found`, 'FEEDBACK_NOT_FOUND');
  }

  let newStatus = feedback.status;
  let newVisibility = feedback.visibility;
  let publishedAt = feedback.publishedAt;
  let resolvedAt = feedback.resolvedAt;

  switch (action) {
    case 'PUBLISH':
      newStatus = 'PUBLISHED';
      newVisibility = 'PUBLIC';
      if (!publishedAt) publishedAt = new Date();
      break;
    case 'HIDE':
      newStatus = 'HIDDEN';
      newVisibility = 'HIDDEN';
      break;
    case 'REJECT':
      newStatus = 'REJECTED';
      newVisibility = 'HIDDEN';
      break;
    case 'RESOLVE':
      newStatus = 'RESOLVED';
      resolvedAt = new Date();
      break;
    case 'ARCHIVE':
      newStatus = 'ARCHIVED';
      newVisibility = 'HIDDEN';
      break;
    case 'RESTORE':
      newStatus = 'PUBLISHED';
      newVisibility = 'PUBLIC';
      break;
    default:
      throw ApiError.badRequest(`Unsupported moderation action: ${action}`, 'INVALID_ACTION');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update feedback state
    await tx.feedback.update({
      where: { id: feedbackId },
      data: {
        status: newStatus,
        visibility: newVisibility,
        publishedAt,
        resolvedAt,
      },
    });

    // 2. Record moderation history
    await tx.feedbackModerationHistory.create({
      data: {
        feedbackId,
        moderatorId: adminUser?.id || null,
        action,
        previousStatus: feedback.status,
        newStatus,
        reason: reason || `Action '${action}' applied by ${adminUser?.name || 'Administrator'}`,
      },
    });

    // 3. Record status history if status changed
    if (feedback.status !== newStatus) {
      await tx.feedbackStatusHistory.create({
        data: {
          feedbackId,
          changedById: adminUser?.id || null,
          oldStatus: feedback.status,
          newStatus,
          reason: reason || `Status updated via moderation action '${action}'`,
        },
      });
    }
  });

  logger.info(`Feedback [${feedbackId}] moderated with action [${action}] by [${adminUser?.id}]`, {
    feedbackId,
    action,
    previousStatus: feedback.status,
    newStatus,
  });

  return getFeedbackById(feedbackId);
}

/**
 * Direct status transition with audit log tracking.
 */
export async function updateFeedbackStatus(feedbackId, newStatus, reason, adminUser) {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
  });

  if (!feedback) {
    throw ApiError.notFound(`Feedback with ID '${feedbackId}' not found`, 'FEEDBACK_NOT_FOUND');
  }

  if (feedback.status === newStatus) {
    return formatFeedbackItem(feedback);
  }

  await prisma.$transaction(async (tx) => {
    await tx.feedback.update({
      where: { id: feedbackId },
      data: {
        status: newStatus,
        resolvedAt: newStatus === 'RESOLVED' ? new Date() : feedback.resolvedAt,
      },
    });

    await tx.feedbackStatusHistory.create({
      data: {
        feedbackId,
        changedById: adminUser?.id || null,
        oldStatus: feedback.status,
        newStatus,
        reason: reason || `Status changed to ${newStatus}`,
      },
    });
  });

  return getFeedbackById(feedbackId);
}

/**
 * Database aggregation of reputation and platform feedback metrics.
 * Excludes HIDDEN and REJECTED reviews from public reputation score calculations.
 */
export async function getFeedbackStatistics(queryParams = {}) {
  const where = {};

  if (queryParams.city && queryParams.city !== 'All Cities') {
    where.city = queryParams.city;
  }
  if (queryParams.type && queryParams.type !== 'ALL') {
    where.type = queryParams.type;
  }
  if (queryParams.dateFrom || queryParams.dateTo) {
    where.createdAt = {};
    if (queryParams.dateFrom) where.createdAt.gte = new Date(queryParams.dateFrom);
    if (queryParams.dateTo) where.createdAt.lte = new Date(queryParams.dateTo);
  }

  // Public reviews condition for authoritative ratings
  const publicWhere = {
    ...where,
    status: { in: ['PUBLISHED', 'REVIEWED', 'RESOLVED'] },
    visibility: 'PUBLIC',
  };

  const [
    totalAll,
    publicCount,
    verifiedCount,
    ratingAgg,
    ratingsGroup,
    pendingModerationCount,
    flaggedCount,
    hiddenCount,
    pendingReportsCount,
  ] = await prisma.$transaction([
    prisma.feedback.count({ where }),
    prisma.feedback.count({ where: publicWhere }),
    prisma.feedback.count({ where: { ...publicWhere, isVerified: true } }),
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
    prisma.feedback.count({
      where: { ...where, status: { in: ['NEW', 'PENDING', 'UNDER_REVIEW'] } },
    }),
    prisma.feedback.count({
      where: { ...where, status: 'FLAGGED' },
    }),
    prisma.feedback.count({
      where: { ...where, status: 'HIDDEN' },
    }),
    prisma.feedbackReport.count({
      where: { status: 'PENDING' },
    }),
  ]);

  // Format distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingsGroup.forEach((g) => {
    if (ratingDistribution[g.rating] !== undefined) {
      ratingDistribution[g.rating] = g._count.rating;
    }
  });

  const totalReviews = publicCount || 0;
  const rawAvg = ratingAgg._avg.rating || 0;
  const averageRating = totalReviews > 0 ? parseFloat(rawAvg.toFixed(2)) : 0;

  // Sentiment distributions
  const positiveCount = ratingDistribution[5] + ratingDistribution[4];
  const neutralCount = ratingDistribution[3];
  const negativeCount = ratingDistribution[2] + ratingDistribution[1];

  const positivePercentage = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 0;
  const neutralPercentage = totalReviews > 0 ? Math.round((neutralCount / totalReviews) * 100) : 0;
  const negativePercentage = totalReviews > 0 ? Math.round((negativeCount / totalReviews) * 100) : 0;

  // Net Promoter Score (NPS): % Promoters (5-star) - % Detractors (1-2 star)
  const promoterPct = totalReviews > 0 ? (ratingDistribution[5] / totalReviews) * 100 : 0;
  const detractorPct = totalReviews > 0 ? ((ratingDistribution[1] + ratingDistribution[2]) / totalReviews) * 100 : 0;
  const netPromoterScore = Math.round(promoterPct - detractorPct);

  return {
    averageRating,
    totalReviews,
    netPromoterScore,
    positivePercentage,
    neutralPercentage,
    negativePercentage,
    verifiedReviews: verifiedCount,
    ratingDistribution,
    operationalCounts: {
      totalFeedback: totalAll,
      pendingModeration: pendingModerationCount,
      flaggedCount,
      hiddenCount,
      unresolvedReports: pendingReportsCount,
    },
  };
}

/**
 * List all active feedback categories.
 */
export async function listFeedbackCategories() {
  return prisma.feedbackCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * Report an inappropriate feedback entry.
 */
export async function reportFeedback(feedbackId, reportData) {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
  });

  if (!feedback) {
    throw ApiError.notFound(`Feedback with ID '${feedbackId}' not found`, 'FEEDBACK_NOT_FOUND');
  }

  const report = await prisma.feedbackReport.create({
    data: {
      feedbackId,
      reason: reportData.reason,
      description: reportData.description || null,
      reportedBy: reportData.reportedBy || null,
      reporterEmail: reportData.reporterEmail || null,
    },
  });

  // Automatically mark status as FLAGGED if not already reviewed or resolved
  if (feedback.status === 'PUBLISHED' || feedback.status === 'NEW') {
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { status: 'FLAGGED' },
    });
  }

  return report;
}

/**
 * List reports for moderation queue.
 */
export async function listFeedbackReports(queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit || 20, 10)));
  const skip = (page - 1) * limit;

  const where = {};
  if (queryParams.status && queryParams.status !== 'ALL') {
    where.status = queryParams.status;
  }

  const [total, reports] = await prisma.$transaction([
    prisma.feedbackReport.count({ where }),
    prisma.feedbackReport.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        feedback: true,
        reviewedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    items: reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Review a moderation report (dismiss or take moderation action).
 */
export async function reviewReport(reportId, { action, actionTaken }, adminUser) {
  const report = await prisma.feedbackReport.findUnique({
    where: { id: reportId },
    include: { feedback: true },
  });

  if (!report) {
    throw ApiError.notFound(`Feedback report '${reportId}' not found`, 'REPORT_NOT_FOUND');
  }

  const newStatus = action === 'DISMISS' ? 'DISMISSED' : 'ACTION_TAKEN';

  const updatedReport = await prisma.$transaction(async (tx) => {
    const res = await tx.feedbackReport.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        reviewedById: adminUser?.id || null,
        reviewedAt: new Date(),
        actionTaken: actionTaken || `Action '${action}' applied by ${adminUser?.name || 'Administrator'}`,
      },
    });

    // If action taken, optionally hide the feedback
    if (action === 'TAKE_ACTION' && report.feedback) {
      await tx.feedback.update({
        where: { id: report.feedbackId },
        data: { status: 'HIDDEN', visibility: 'HIDDEN' },
      });

      await tx.feedbackModerationHistory.create({
        data: {
          feedbackId: report.feedbackId,
          moderatorId: adminUser?.id || null,
          action: 'HIDE',
          previousStatus: report.feedback.status,
          newStatus: 'HIDDEN',
          reason: `Report ${reportId} resolved with action taken: ${actionTaken || 'Flagged content hidden'}`,
        },
      });
    }

    return res;
  });

  return updatedReport;
}
