// ==============================================================================
// Ardab Market - Customer Product Reviews & Management Routes
// ==============================================================================

import { Router } from 'express';
import {
  customerAuthMiddleware,
  optionalCustomerAuthMiddleware,
} from '../middleware/customerAuth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  getProductReviewsHandler,
  checkReviewEligibilityHandler,
  createProductReviewHandler,
  getMyReviewsHandler,
  getMyReviewByIdHandler,
  updateMyReviewHandler,
  deleteMyReviewHandler,
} from '../controllers/review.controller.js';
import {
  productIdParamSchema,
  reviewIdParamSchema,
  createProductReviewSchema,
  updateCustomerReviewSchema,
  productReviewsQuerySchema,
  customerReviewsQuerySchema,
} from '../validators/review.validator.js';

const router = Router();

// ------------------------------------------------------------------------------
// Product-Level Review Routes (/api/customer/products/:productId/reviews)
// ------------------------------------------------------------------------------

/**
 * Product-level review router (mounted on /products/:productId and /catalog/products/:productId)
 */
export const productLevelReviewRouter = Router({ mergeParams: true });

productLevelReviewRouter.get(
  '/reviews',
  optionalCustomerAuthMiddleware,
  validate({ params: productIdParamSchema, query: productReviewsQuerySchema }),
  asyncHandler(getProductReviewsHandler)
);

productLevelReviewRouter.get(
  ['/review-eligibility', '/reviews/eligibility'],
  customerAuthMiddleware,
  validate({ params: productIdParamSchema }),
  asyncHandler(checkReviewEligibilityHandler)
);

productLevelReviewRouter.post(
  '/reviews',
  customerAuthMiddleware,
  validate({ params: productIdParamSchema, body: createProductReviewSchema }),
  asyncHandler(createProductReviewHandler)
);

/**
 * Public: Get reviews, rating summary, and distribution for a specific product
 * (Optionally attaches customerReview and eligibility if authenticated)
 */
export const productReviewSubRouter = Router({ mergeParams: true });

productReviewSubRouter.get(
  '/',
  optionalCustomerAuthMiddleware,
  validate({ params: productIdParamSchema, query: productReviewsQuerySchema }),
  asyncHandler(getProductReviewsHandler)
);

productReviewSubRouter.get(
  ['/eligibility', '/review-eligibility'],
  customerAuthMiddleware,
  validate({ params: productIdParamSchema }),
  asyncHandler(checkReviewEligibilityHandler)
);

productReviewSubRouter.post(
  '/',
  customerAuthMiddleware,
  validate({ params: productIdParamSchema, body: createProductReviewSchema }),
  asyncHandler(createProductReviewHandler)
);

// ------------------------------------------------------------------------------
// Customer Personal Review Management Routes (/api/customer/reviews/*)
// ------------------------------------------------------------------------------

router.get(
  '/',
  customerAuthMiddleware,
  validate({ query: customerReviewsQuerySchema }),
  asyncHandler(getMyReviewsHandler)
);

router.get(
  '/:id',
  customerAuthMiddleware,
  validate({ params: reviewIdParamSchema }),
  asyncHandler(getMyReviewByIdHandler)
);

router.patch(
  '/:id',
  customerAuthMiddleware,
  validate({ params: reviewIdParamSchema, body: updateCustomerReviewSchema }),
  asyncHandler(updateMyReviewHandler)
);

router.delete(
  '/:id',
  customerAuthMiddleware,
  validate({ params: reviewIdParamSchema }),
  asyncHandler(deleteMyReviewHandler)
);

export default router;
