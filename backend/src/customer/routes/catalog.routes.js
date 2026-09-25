// ==============================================================================
// Ardab Market - Customer Catalog, Review & Public Marketplace Routes
// ==============================================================================

import { Router } from 'express';
import {
  getCustomerProducts,
  getCustomerProductDetails,
  getCustomerCategories,
  getCustomerCategoryTree,
  getCustomerCategoryById,
  getCustomerCategoryDescendants,
  getCustomerCategoryAttributes,
  getCustomerCities,
  getCustomerSellers,
  getCustomerSellerById,
  getCustomerPaymentMethods,
  getCustomerReviews,
  postCustomerReview,
} from '../controllers/catalog.controller.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  customerAuthMiddleware,
  optionalCustomerAuthMiddleware,
} from '../middleware/customerAuth.middleware.js';
import { publicApiCache } from '../../shared/middleware/cache.middleware.js';

const router = Router();

// Public Catalog Endpoints (with lightweight memory & HTTP caching)
router.get('/products', publicApiCache(60), asyncHandler(getCustomerProducts));
router.get('/products/:id', publicApiCache(60), asyncHandler(getCustomerProductDetails));
router.get('/categories', publicApiCache(300), asyncHandler(getCustomerCategories));
router.get('/categories/tree', publicApiCache(300), asyncHandler(getCustomerCategoryTree));
router.get('/categories/:id', publicApiCache(300), asyncHandler(getCustomerCategoryById));
router.get('/categories/:id/descendants', publicApiCache(300), asyncHandler(getCustomerCategoryDescendants));
router.get('/categories/:id/attributes', publicApiCache(300), asyncHandler(getCustomerCategoryAttributes));
router.get('/cities', publicApiCache(600), asyncHandler(getCustomerCities));
router.get('/sellers', publicApiCache(300), asyncHandler(getCustomerSellers));
router.get('/sellers/:id', publicApiCache(120), asyncHandler(getCustomerSellerById));
router.get('/payment-methods', publicApiCache(600), asyncHandler(getCustomerPaymentMethods));

// Reviews (public read, authenticated submission)
router.get('/reviews', optionalCustomerAuthMiddleware, asyncHandler(getCustomerReviews));
router.post('/reviews', customerAuthMiddleware, asyncHandler(postCustomerReview));

export default router;
