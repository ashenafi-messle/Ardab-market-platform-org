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
  getCustomerCategoryAttributes,
  getCustomerCities,
  getCustomerSellers,
  getCustomerSellerById,
  getCustomerPaymentMethods,
  getCustomerReviews,
  postCustomerReview,
  getMyOrdersHandler,
  getMyOrderDetailsHandler,
} from '../controllers/catalog.controller.js';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

// Public Catalog Endpoints
router.get('/products', asyncHandler(getCustomerProducts));
router.get('/products/:id', asyncHandler(getCustomerProductDetails));
router.get('/categories', asyncHandler(getCustomerCategories));
router.get('/categories/tree', asyncHandler(getCustomerCategoryTree));
router.get('/categories/:id', asyncHandler(getCustomerCategoryById));
router.get('/categories/:id/attributes', asyncHandler(getCustomerCategoryAttributes));
router.get('/cities', asyncHandler(getCustomerCities));
router.get('/sellers', asyncHandler(getCustomerSellers));
router.get('/sellers/:id', asyncHandler(getCustomerSellerById));
router.get('/payment-methods', asyncHandler(getCustomerPaymentMethods));

// Reviews
router.get('/reviews', asyncHandler(getCustomerReviews));
router.post('/reviews', asyncHandler(postCustomerReview));

// Orders
router.get('/orders', asyncHandler(getMyOrdersHandler));
router.get('/orders/:id', asyncHandler(getMyOrderDetailsHandler));

export default router;
