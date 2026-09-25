// ==============================================================================
// Ardab Market - Customer Marketplace Catalog Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  listCustomerProducts,
  getCustomerProductDetails as fetchCustomerProductDetails,
} from '../services/customerCatalog.service.js';
import {
  listCategories,
  getCategoryTree,
  getCategoryById,
  getDescendantCategoryIds,
} from '../../admin/services/category.service.js';
import { resolveEffectiveCategoryAttributes } from '../../admin/services/categoryAttribute.service.js';
import { citiesService } from '../../admin/services/cities.service.js';
import { listSuppliers } from '../../admin/services/supplier.service.js';
import { listPaymentMethods } from '../../admin/services/paymentMethod.service.js';
import { listFeedback, createFeedback } from '../../admin/services/feedback.service.js';
import { getProductReviews, createCustomerProductReview } from '../services/review.service.js';
import { prisma } from '../../shared/config/database.js';

/**
 * GET /api/customer/catalog/products
 * Public customer product listing with search, category filtering, city availability, and sorting
 */
export async function getCustomerProducts(req, res) {
  const query = {
    ...req.query,
    status: req.query.status || 'ACTIVE',
  };
  const result = await listCustomerProducts(query);
  return ApiResponse.success(res, result, 'Marketplace products retrieved');
}

/**
 * GET /api/customer/catalog/products/:id
 * Detailed customer product view
 */
export async function getCustomerProductDetails(req, res) {
  const product = await fetchCustomerProductDetails(req.params.id);
  return ApiResponse.success(res, product, 'Product details retrieved');
}

/**
 * GET /api/customer/catalog/categories
 * Flat category list (supports ?root=true for top-level root categories)
 */
export async function getCustomerCategories(req, res) {
  const query = { activeOnly: 'true', ...req.query };
  if (req.query.root === 'true' || req.query.root === true) {
    query.parentId = null;
  }
  const result = await listCategories(query);
  return ApiResponse.success(res, result, 'Categories retrieved');
}

/**
 * GET /api/customer/catalog/categories/tree
 * Full category tree with unlimited depth
 */
export async function getCustomerCategoryTree(req, res) {
  const tree = await getCategoryTree({ activeOnly: 'true' });
  return ApiResponse.success(res, tree, 'Category tree retrieved');
}

/**
 * GET /api/customer/catalog/categories/:id
 */
export async function getCustomerCategoryById(req, res) {
  const category = await getCategoryById(req.params.id);
  return ApiResponse.success(res, category, 'Category details retrieved');
}

/**
 * GET /api/customer/catalog/categories/:id/descendants
 * Efficient server-side descendant IDs retrieval for category product filtering
 */
export async function getCustomerCategoryDescendants(req, res) {
  const descendantIds = await getDescendantCategoryIds(req.params.id);
  return ApiResponse.success(res, {
    categoryId: req.params.id,
    descendantIds,
    allCategoryIds: [req.params.id, ...descendantIds],
  }, 'Category descendants retrieved');
}

/**
 * GET /api/customer/catalog/categories/:id/attributes
 * Category dynamic attributes and logistics configuration
 */
export async function getCustomerCategoryAttributes(req, res) {
  const effective = await resolveEffectiveCategoryAttributes(req.params.id);
  return ApiResponse.success(res, effective, 'Effective category attributes retrieved');
}

/**
 * GET /api/customer/catalog/cities
 * Active operational cities for customer location and delivery selection
 */
export async function getCustomerCities(req, res) {
  const cities = await citiesService.listCities({ includeInactive: false });
  return ApiResponse.success(res, cities, 'Operational cities retrieved');
}

/**
 * GET /api/customer/catalog/sellers
 * Public active sellers list
 */
export async function getCustomerSellers(req, res) {
  const result = await listSuppliers({ status: 'ACTIVE', ...req.query });
  return ApiResponse.success(res, result, 'Marketplace sellers retrieved');
}

/**
 * GET /api/customer/catalog/sellers/:id
 * Detailed public seller profile
 */
export async function getCustomerSellerById(req, res) {
  const seller = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: {
      sellerCategories: {
        include: { category: true },
      },
      products: {
        where: { status: 'ACTIVE' },
        include: { images: true },
        take: 12,
      },
    },
  });
  if (!seller) {
    return ApiResponse.error(res, 'SELLER_NOT_FOUND', 'Seller not found', 404);
  }
  return ApiResponse.success(res, seller, 'Seller details retrieved');
}

/**
 * GET /api/customer/catalog/payment-methods
 * Active customer payment methods
 */
export async function getCustomerPaymentMethods(req, res) {
  const methods = await listPaymentMethods({ activeOnly: true });
  return ApiResponse.success(res, methods, 'Active payment methods retrieved');
}

/**
 * GET /api/customer/catalog/reviews
 * Public reviews for products or sellers
 */
export async function getCustomerReviews(req, res) {
  if (req.query.productId) {
    const result = await getProductReviews(req.query.productId, req.query, req.customer?.id || null);
    return ApiResponse.success(res, result, 'Customer reviews retrieved');
  }
  const query = {
    ...req.query,
    status: 'PUBLISHED',
  };
  const result = await listFeedback(query);
  return ApiResponse.success(res, result, 'Customer reviews retrieved');
}

/**
 * POST /api/customer/catalog/reviews
 * Submit a customer product or seller review
 */
export async function postCustomerReview(req, res) {
  const customerId = req.customer?.id;
  if (req.body.productId) {
    const review = await createCustomerProductReview(customerId, req.body);
    return ApiResponse.success(res, review, 'Review submitted successfully', 201);
  }
  const reviewData = {
    ...req.body,
    customerId,
    authorName: req.customer?.fullName || req.body.authorName || 'Verified Customer',
  };
  const review = await createFeedback(reviewData);
  return ApiResponse.success(res, review, 'Review submitted successfully', 201);
}
