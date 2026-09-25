// ==============================================================================
// Ardab Market - Customer Mobile Catalog Routes
// ==============================================================================
// Domain: Customer Mobile App (backend/src/customer-mobile/routes/catalog.routes.js)
// Exposes category and product endpoints specifically for the mobile app.
// ==============================================================================

import { Router } from 'express';
import {
  getMobileProductsHandler,
  getMobileProductDetailsHandler,
  getMobileSpecialOffersHandler,
  getMobileCategoriesHandler,
  getMobileCategoryTreeHandler,
  getMobileCategoryByIdHandler,
  getMobileCategoryDescendantsHandler,
  getMobileCategoryProductsHandler,
} from '../controllers/catalog.controller.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { publicApiCache } from '../../shared/middleware/cache.middleware.js';

const router = Router();

// Products (Note: special-offers must come before :id)
router.get('/products/special-offers', publicApiCache(60), asyncHandler(getMobileSpecialOffersHandler));
router.get('/special-offers', publicApiCache(60), asyncHandler(getMobileSpecialOffersHandler));
router.get('/products', publicApiCache(60), asyncHandler(getMobileProductsHandler));
router.get('/products/:id', publicApiCache(60), asyncHandler(getMobileProductDetailsHandler));

// Categories
router.get('/categories', publicApiCache(300), asyncHandler(getMobileCategoriesHandler));
router.get('/categories/tree', publicApiCache(300), asyncHandler(getMobileCategoryTreeHandler));
router.get('/categories/:id/descendants', publicApiCache(300), asyncHandler(getMobileCategoryDescendantsHandler));
router.get('/categories/:id/products', publicApiCache(60), asyncHandler(getMobileCategoryProductsHandler));
router.get('/categories/:id', publicApiCache(300), asyncHandler(getMobileCategoryByIdHandler));

export default router;
