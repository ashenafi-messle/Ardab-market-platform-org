// ==============================================================================
// Ardab Market - Customer Wishlist Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  getWishlist,
  toggleWishlistItem,
  removeFromWishlist,
  clearWishlist,
  syncWishlist,
  checkWishlistItem,
} from '../services/wishlist.service.js';

/**
 * GET /api/customer/wishlist
 * Returns the authenticated customer's wishlist.
 */
export async function getWishlistHandler(req, res) {
  const customerId = req.customer.id;
  const result = await getWishlist(customerId);
  return ApiResponse.success(res, result, 'Wishlist retrieved');
}

/**
 * POST /api/customer/wishlist/toggle
 * Adds or removes a product from the wishlist.
 * Body: { productId }
 */
export async function toggleWishlistHandler(req, res) {
  const customerId = req.customer.id;
  const { productId } = req.body;

  if (!productId || typeof productId !== 'string') {
    return ApiResponse.error(res, 'VALIDATION_ERROR', 'productId is required', 400);
  }

  const result = await toggleWishlistItem(customerId, productId);
  const message = result.action === 'added' ? 'Product added to wishlist' : 'Product removed from wishlist';
  return ApiResponse.success(res, result, message);
}

/**
 * DELETE /api/customer/wishlist/:productId
 * Removes a specific product from the wishlist.
 */
export async function removeWishlistItemHandler(req, res) {
  const customerId = req.customer.id;
  const { productId } = req.params;

  const result = await removeFromWishlist(customerId, productId);
  return ApiResponse.success(res, result, 'Product removed from wishlist');
}

/**
 * DELETE /api/customer/wishlist
 * Clears the entire wishlist.
 */
export async function clearWishlistHandler(req, res) {
  const customerId = req.customer.id;
  const result = await clearWishlist(customerId);
  return ApiResponse.success(res, result, 'Wishlist cleared');
}

/**
 * POST /api/customer/wishlist/sync
 * Syncs a batch of local wishlist product IDs to the server.
 * Used on login to persist localStorage wishlist to database.
 * Body: { productIds: string[] }
 */
export async function syncWishlistHandler(req, res) {
  const customerId = req.customer.id;
  const { productIds } = req.body;

  if (!Array.isArray(productIds)) {
    return ApiResponse.error(res, 'VALIDATION_ERROR', 'productIds must be an array', 400);
  }

  const result = await syncWishlist(customerId, productIds);
  return ApiResponse.success(res, result, 'Wishlist synced successfully');
}

/**
 * GET /api/customer/wishlist/check/:productId
 * Checks if a specific product is in the authenticated customer's wishlist.
 */
export async function checkWishlistItemHandler(req, res) {
  const customerId = req.customer.id;
  const { productId } = req.params;

  const result = await checkWishlistItem(customerId, productId);
  return ApiResponse.success(res, result, 'Wishlist check completed');
}
