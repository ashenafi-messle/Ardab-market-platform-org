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
  getMobileCategoriesHandler,
  getMobileCategoryTreeHandler,
  getMobileCategoryByIdHandler,
  getMobileCategoryDescendantsHandler,
} from '../controllers/catalog.controller.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { publicApiCache } from '../../shared/middleware/cache.middleware.js';

const router = Router();

// Products
router.get('/products', publicApiCache(60), asyncHandler(getMobileProductsHandler));
router.get('/products/:id', publicApiCache(60), asyncHandler(getMobileProductDetailsHandler));

// Categories
router.get('/categories', publicApiCache(300), asyncHandler(getMobileCategoriesHandler));
router.get('/categories/tree', publicApiCache(300), asyncHandler(getMobileCategoryTreeHandler));
router.get('/categories/:id', publicApiCache(300), asyncHandler(getMobileCategoryByIdHandler));
router.get('/categories/:id/descendants', publicApiCache(300), asyncHandler(getMobileCategoryDescendantsHandler));

export default router;
