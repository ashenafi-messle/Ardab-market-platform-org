// ==============================================================================
// Ardab Market - Consolidated Customer Home Data Service
// ==============================================================================
// High-performance single-roundtrip Home endpoint for customer mobile app.
// Parallelizes independent queries using Promise.allSettled and minimal field selection.
// Supports both authenticated customers and guest browsing.
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { MobileCatalogService } from '../../customer-mobile/services/catalog.service.js';
import { logger } from '../../shared/utils/logger.js';

export async function getConsolidatedHomeData({ customerId = null, city = 'All Cities', cartProductIds = [] }) {
  const startTime = Date.now();

  // 1. Parallelize core marketplace catalog queries
  const catalogPromises = [
    // [0] Categories tree (with live database images from latest active products)
    MobileCatalogService.getCategoryTree().catch((err) => {
      logger.warn('[HomeService] getCategoryTree error:', { error: err.message });
      return [];
    }),

    // [1] Special offers (authoritative active discounts only, status = ACTIVE, discountPercent > 0)
    MobileCatalogService.getSpecialOffers({ limit: 12, city }).catch((err) => {
      logger.warn('[HomeService] getSpecialOffers error:', { error: err.message });
      return { items: [] };
    }),

    // [2] Trending/popular products (sorted by popularity/rating)
    MobileCatalogService.listProducts({ limit: 12, city, sort: 'popular' }).catch((err) => {
      logger.warn('[HomeService] listTrending error:', { error: err.message });
      return { items: [] };
    }),

    // [3] Recommended/newest products
    MobileCatalogService.listProducts({ limit: 20, city, sort: 'newest' }).catch((err) => {
      logger.warn('[HomeService] listRecommended error:', { error: err.message });
      return { items: [] };
    }),
  ];

  // 2. Customer-specific queries (only if customerId is present from authenticated token)
  let notificationPromise = Promise.resolve(0);
  let latestOrderPromise = Promise.resolve(null);
  let wishlistPromise = Promise.resolve([]);
  let profilePromise = Promise.resolve(null);

  if (customerId) {
    // Unread notifications count
    notificationPromise = prisma.notificationRecipient.count({
      where: {
        customerId,
        isHidden: false,
        isRead: false,
      },
    }).catch((err) => {
      logger.warn('[HomeService] notificationCount error:', { error: err.message });
      return 0;
    });

    // Minimal latest order summary for Home status card
    latestOrderPromise = prisma.order.findFirst({
      where: { customerId },
      orderBy: { placedAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
        placedAt: true,
        createdAt: true,
        estimatedDelivery: true,
        delivery: {
          select: {
            id: true,
            status: true,
            estimatedDeliveryAt: true,
            deliveredAt: true,
          },
        },
      },
    }).catch((err) => {
      logger.warn('[HomeService] latestOrder error:', { error: err.message });
      return null;
    });

    // Wishlist product IDs
    wishlistPromise = prisma.customerWishlistItem.findMany({
      where: { customerId },
      select: { productId: true },
    }).catch((err) => {
      logger.warn('[HomeService] wishlistIds error:', { error: err.message });
      return [];
    });

    // Lightweight profile info for Home greeting
    profilePromise = prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        fullName: true,
        city: true,
        profileImageUrl: true,
      },
    }).catch((err) => {
      logger.warn('[HomeService] customerProfile error:', { error: err.message });
      return null;
    });
  }

  // 3. Cart validation query for active products currently in client cart
  let cartValidationPromise = Promise.resolve([]);
  const validCartIds = Array.isArray(cartProductIds)
    ? cartProductIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
    : [];

  if (validCartIds.length > 0) {
    cartValidationPromise = prisma.product.findMany({
      where: { id: { in: validCartIds } },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        originalPrice: true,
        discountPercent: true,
        status: true,
        cityAvailability: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
      },
    }).catch((err) => {
      logger.warn('[HomeService] cartValidation error:', { error: err.message });
      return [];
    });
  }

  // 4. Resolve all promises concurrently
  const [
    [categories, specialOffersRes, trendingRes, recommendedRes],
    unreadCount,
    rawOrder,
    wishlistItems,
    customerProfile,
    cartDbProducts,
  ] = await Promise.all([
    Promise.all(catalogPromises),
    notificationPromise,
    latestOrderPromise,
    wishlistPromise,
    profilePromise,
    cartValidationPromise,
  ]);

  // Format latest order safely
  let latestOrder = null;
  if (rawOrder) {
    latestOrder = {
      id: rawOrder.id,
      orderNumber: rawOrder.orderNumber,
      status: rawOrder.status,
      paymentStatus: rawOrder.paymentStatus,
      paymentMethod: rawOrder.paymentMethod,
      total: rawOrder.totalAmount ? Number(rawOrder.totalAmount) : 0,
      placedAt: rawOrder.placedAt ? rawOrder.placedAt.toISOString() : rawOrder.createdAt?.toISOString(),
      estimatedDelivery: rawOrder.estimatedDelivery || null,
      deliveryStatus: rawOrder.delivery?.status || null,
    };
  }

  // Format cart validation items
  const cartValidation = (cartDbProducts || []).map((p) => {
    const rawSelling = Number(p.sellingPrice);
    const rawOriginal = p.originalPrice !== null && p.originalPrice !== undefined ? Number(p.originalPrice) : null;
    const discountPercent = p.discountPercent || 0;
    const hasDiscount = discountPercent > 0 || (rawOriginal !== null && rawOriginal > rawSelling);
    const originalPrice = rawOriginal !== null ? rawOriginal : (hasDiscount && discountPercent > 0 ? Math.round(rawSelling / (1 - discountPercent / 100)) : rawSelling);

    return {
      id: p.id,
      name: p.name,
      price: rawSelling,
      originalPrice: hasDiscount ? originalPrice : null,
      discountPercent,
      hasDiscount,
      status: p.status,
      isAvailable: p.status === 'ACTIVE',
      cityAvailability: p.cityAvailability || ['All Cities'],
      primaryImage: p.images?.[0]?.url || null,
    };
  });

  const durationMs = Date.now() - startTime;
  logger.info('[HomeService] Consolidated home data fetched', {
    hasCustomer: !!customerId,
    city,
    categoriesCount: categories?.length || 0,
    specialOffersCount: specialOffersRes?.items?.length || 0,
    trendingCount: trendingRes?.items?.length || 0,
    durationMs,
  });

  return {
    categories: categories || [],
    specialOffers: specialOffersRes?.items || [],
    trendingProducts: trendingRes?.items || [],
    recommendedProducts: recommendedRes?.items || [],
    heroProducts: (trendingRes?.items || []).slice(0, 2),
    unreadNotificationCount: unreadCount || 0,
    latestOrder,
    wishlistProductIds: (wishlistItems || []).map((w) => w.productId).filter(Boolean),
    customer: customerProfile,
    cartValidation,
    serverTimestamp: new Date().toISOString(),
  };
}
