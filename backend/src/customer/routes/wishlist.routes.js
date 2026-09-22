// ==============================================================================
// Ardab Market - Customer Wishlist Routes
// ==============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import {
  getWishlistHandler,
  toggleWishlistHandler,
  removeWishlistItemHandler,
  clearWishlistHandler,
  syncWishlistHandler,
  checkWishlistItemHandler,
} from '../controllers/wishlist.controller.js';

const router = Router();

// All wishlist routes require authentication
router.use(customerAuthMiddleware);

/**
 * @route   GET /api/customer/wishlist
 * @desc    Get authenticated customer's wishlist
 * @access  Customer (Auth Required)
 */
router.get('/', asyncHandler(getWishlistHandler));

/**
 * @route   POST /api/customer/wishlist/toggle
 * @desc    Toggle a product in the wishlist (add if not present, remove if present)
 * @access  Customer (Auth Required)
 * @body    { productId: string }
 */
router.post('/toggle', asyncHandler(toggleWishlistHandler));

/**
 * @route   POST /api/customer/wishlist/sync
 * @desc    Sync local (localStorage) wishlist to database on login
 * @access  Customer (Auth Required)
 * @body    { productIds: string[] }
 */
router.post('/sync', asyncHandler(syncWishlistHandler));

/**
 * @route   GET /api/customer/wishlist/check/:productId
 * @desc    Check if a specific product is in the customer's wishlist
 * @access  Customer (Auth Required)
 */
router.get('/check/:productId', asyncHandler(checkWishlistItemHandler));

/**
 * @route   DELETE /api/customer/wishlist/:productId
 * @desc    Remove a specific product from the wishlist
 * @access  Customer (Auth Required)
 */
router.delete('/:productId', asyncHandler(removeWishlistItemHandler));

/**
 * @route   DELETE /api/customer/wishlist
 * @desc    Clear all wishlist items
 * @access  Customer (Auth Required)
 */
router.delete('/', asyncHandler(clearWishlistHandler));

export default router;
