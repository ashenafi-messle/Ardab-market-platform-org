// ==============================================================================
// Ardab Market - Customer Home Controller
// ==============================================================================
// Handles consolidated Home requests (/api/customer/home and /api/customer-mobile/home).
// Returns single optimized payload for categories, products, offers, cart,
// notifications, wishlist, order status, and profile.
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { getConsolidatedHomeData } from '../services/home.service.js';
import { logger } from '../../shared/utils/logger.js';

export async function getHomeDataHandler(req, res, next) {
  try {
    const customerId = req.customer?.id || null;
    const city = req.query.city || 'All Cities';
    const cartProductIds = req.query.cartProductIds
      ? req.query.cartProductIds.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    const homeData = await getConsolidatedHomeData({
      customerId,
      city,
      cartProductIds,
    });

    return ApiResponse.success(res, homeData, 'Home data fetched successfully');
  } catch (error) {
    logger.error('[CustomerMobileHome] Failed to load marketplace home data:', {
      error: error.message,
      stack: error.stack,
      city: req.query.city,
      customerId: req.customer?.id,
    });
    return next(error);
  }
}
