// ==============================================================================
// Ardab Market - Customer Mobile Catalog Controller
// ==============================================================================
// Domain: Customer Mobile App (backend/src/customer-mobile/controllers/catalog.controller.js)
// Controllers handling category and product requests for the mobile application.
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { MobileCatalogService } from '../services/catalog.service.js';

/**
 * GET /api/customer-mobile/products
 * Public products browsing for customer mobile app
 */
export async function getMobileProductsHandler(req, res) {
  const result = await MobileCatalogService.listProducts(req.query);
  return ApiResponse.success(res, result, 'Products retrieved successfully');
}

/**
 * GET /api/customer-mobile/products/:id
 * Detailed product view for customer mobile app
 */
export async function getMobileProductDetailsHandler(req, res) {
  const product = await MobileCatalogService.getProductDetails(req.params.id);
  return ApiResponse.success(res, product, 'Product details retrieved successfully');
}

/**
 * GET /api/customer-mobile/categories
 * Flat categories or root categories list (via ?root=true)
 */
export async function getMobileCategoriesHandler(req, res) {
  const result = await MobileCatalogService.listCategories(req.query);
  return ApiResponse.success(res, result, 'Categories retrieved successfully');
}

/**
 * GET /api/customer-mobile/categories/tree
 * Hierarchical category tree with arbitrary depth
 */
export async function getMobileCategoryTreeHandler(req, res) {
  const tree = await MobileCatalogService.getCategoryTree();
  return ApiResponse.success(res, tree, 'Category tree retrieved successfully');
}

/**
 * GET /api/customer-mobile/categories/:id
 * Category details by ID
 */
export async function getMobileCategoryByIdHandler(req, res) {
  const category = await MobileCatalogService.getCategoryById(req.params.id);
  return ApiResponse.success(res, category, 'Category details retrieved successfully');
}

/**
 * GET /api/customer-mobile/categories/:id/descendants
 * Server-calculated descendant IDs for category filtering
 */
export async function getMobileCategoryDescendantsHandler(req, res) {
  const result = await MobileCatalogService.getCategoryDescendants(req.params.id);
  return ApiResponse.success(res, result, 'Category descendants retrieved successfully');
}

/**
 * GET /api/customer-mobile/categories/:id/products
 * Products belonging to a specific category and its descendants
 */
export async function getMobileCategoryProductsHandler(req, res) {
  const query = { ...req.query, categoryId: req.params.id };
  const result = await MobileCatalogService.listProducts(query);
  return ApiResponse.success(res, result, 'Category products retrieved successfully');
}

/**
 * GET /api/customer-mobile/products/special-offers
 * Products with active Super Admin discounts
 */
export async function getMobileSpecialOffersHandler(req, res) {
  const result = await MobileCatalogService.getSpecialOffers(req.query);
  return ApiResponse.success(res, result, 'Special offers retrieved successfully');
}

