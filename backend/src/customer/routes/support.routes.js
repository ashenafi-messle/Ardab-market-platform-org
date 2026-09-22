// ==============================================================================
// Ardab Market - Customer Support Routes
// ==============================================================================

import { Router } from 'express';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  listCategoriesHandler,
  listCustomerOrdersHandler,
  listRequestsHandler,
  getRequestByIdHandler,
  createRequestHandler,
  replyRequestHandler,
  markReadHandler,
} from '../controllers/support.controller.js';
import {
  requestIdParamSchema,
  customerSupportQuerySchema,
  createCustomerRequestSchema,
  replyCustomerMessageSchema,
} from '../validators/support.validator.js';

const router = Router();

// Publicly or Authenticated accessible categories
router.get('/categories', asyncHandler(listCategoriesHandler));

// All subsequent customer support operations require authenticated customer
router.use(customerAuthMiddleware);

// Get recent customer orders eligible for linking to a ticket
router.get('/orders', asyncHandler(listCustomerOrdersHandler));

// List customer support requests (with pagination, filters, search)
router.get(
  '/requests',
  validate({ query: customerSupportQuerySchema }),
  asyncHandler(listRequestsHandler)
);
// Route alias for /tickets
router.get(
  '/tickets',
  validate({ query: customerSupportQuerySchema }),
  asyncHandler(listRequestsHandler)
);

// Create new customer support request
router.post(
  '/requests',
  validate({ body: createCustomerRequestSchema }),
  asyncHandler(createRequestHandler)
);
// Route alias for /tickets
router.post(
  '/tickets',
  validate({ body: createCustomerRequestSchema }),
  asyncHandler(createRequestHandler)
);

// Get single support conversation
router.get(
  '/requests/:requestId',
  validate({ params: requestIdParamSchema }),
  asyncHandler(getRequestByIdHandler)
);
// Route alias for /tickets/:requestId
router.get(
  '/tickets/:requestId',
  validate({ params: requestIdParamSchema }),
  asyncHandler(getRequestByIdHandler)
);

// Customer reply to conversation
router.post(
  '/requests/:requestId/messages',
  validate({ params: requestIdParamSchema, body: replyCustomerMessageSchema }),
  asyncHandler(replyRequestHandler)
);
router.post(
  '/requests/:requestId/reply',
  validate({ params: requestIdParamSchema, body: replyCustomerMessageSchema }),
  asyncHandler(replyRequestHandler)
);
router.post(
  '/tickets/:requestId/messages',
  validate({ params: requestIdParamSchema, body: replyCustomerMessageSchema }),
  asyncHandler(replyRequestHandler)
);
router.post(
  '/tickets/:requestId/reply',
  validate({ params: requestIdParamSchema, body: replyCustomerMessageSchema }),
  asyncHandler(replyRequestHandler)
);

// Mark conversation as read
router.patch(
  '/requests/:requestId/read',
  validate({ params: requestIdParamSchema }),
  asyncHandler(markReadHandler)
);
router.patch(
  '/tickets/:requestId/read',
  validate({ params: requestIdParamSchema }),
  asyncHandler(markReadHandler)
);

export default router;
