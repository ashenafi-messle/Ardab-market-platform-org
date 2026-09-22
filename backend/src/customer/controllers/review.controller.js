// ==============================================================================
// Ardab Market - Customer Product Reviews & Feedback Controller
// ==============================================================================

import { ApiResponse, ApiError } from '../../shared/utils/apiResponse.js';
import {
  getProductReviews,
  checkReviewEligibility,
  createCustomerProductReview,
  getCustomerReviews,
  getCustomerReviewById,
  updateCustomerReview,
  deleteCustomerReview,
} from '../services/review.service.js';

/**
 * GET /api/customer/products/:productId/reviews
 * Public reviews listing with rating summary, distribution, and optional customer state.
 */
export async function getProductReviewsHandler(req, res) {
  const productId = req.params.productId || req.query.productId;
  if (!productId) {
    throw ApiError.badRequest('Product ID is required');
  }

  const currentCustomerId = req.customer?.id || null;
  const result = await getProductReviews(productId, req.query, currentCustomerId);

  return ApiResponse.success(res, result, 'Product reviews retrieved successfully');
}

/**
 * GET /api/customer/products/:productId/review-eligibility
 * Authoritatively check if authenticated customer can review this product.
 */
export async function checkReviewEligibilityHandler(req, res) {
  const customerId = req.customer?.id;
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const productId = req.params.productId || req.query.productId;
  if (!productId) {
    throw ApiError.badRequest('Product ID is required');
  }

  const eligibility = await checkReviewEligibility(customerId, productId);
  return ApiResponse.success(res, eligibility, 'Review eligibility evaluated');
}

/**
 * POST /api/customer/products/:productId/reviews
 * Submit a verified review for a delivered product purchase.
 */
export async function createProductReviewHandler(req, res) {
  const customerId = req.customer?.id;
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const productId = req.params.productId || req.body.productId;
  if (!productId) {
    throw ApiError.badRequest('Product ID is required');
  }

  const review = await createCustomerProductReview(customerId, {
    ...req.body,
    productId,
  });

  return ApiResponse.success(
    res,
    review,
    'Review submitted successfully. It will appear publicly upon moderation approval.',
    201
  );
}

/**
 * GET /api/customer/reviews
 * Lists all reviews authored by the authenticated customer.
 */
export async function getMyReviewsHandler(req, res) {
  const customerId = req.customer?.id;
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const result = await getCustomerReviews(customerId, req.query);
  return ApiResponse.paginated(
    res,
    result.items,
    result.pagination,
    'Customer reviews retrieved successfully'
  );
}

/**
 * GET /api/customer/reviews/:id
 * Retrieve a specific review authored by the authenticated customer.
 */
export async function getMyReviewByIdHandler(req, res) {
  const customerId = req.customer?.id;
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const review = await getCustomerReviewById(customerId, req.params.id);
  return ApiResponse.success(res, review, 'Review details retrieved');
}

/**
 * PATCH /api/customer/reviews/:id
 * Update an existing review authored by the customer.
 */
export async function updateMyReviewHandler(req, res) {
  const customerId = req.customer?.id;
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const updated = await updateCustomerReview(customerId, req.params.id, req.body);
  return ApiResponse.success(
    res,
    updated,
    'Review updated successfully. It has been resubmitted for moderation.'
  );
}

/**
 * DELETE /api/customer/reviews/:id
 * Soft-delete (archive) an existing review authored by the customer.
 */
export async function deleteMyReviewHandler(req, res) {
  const customerId = req.customer?.id;
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const result = await deleteCustomerReview(customerId, req.params.id);
  return ApiResponse.success(res, result, 'Review deleted successfully');
}
