// ==============================================================================
// Ardab Market - Feedback & Reputation Module Routes
// ==============================================================================

import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requirePermission } from '../middleware/adminPermission.middleware.js';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  listFeedbackHandler,
  getFeedbackByIdHandler,
  createFeedbackHandler,
  respondToFeedbackHandler,
  moderateFeedbackHandler,
  updateFeedbackStatusHandler,
  getFeedbackStatisticsHandler,
  listFeedbackCategoriesHandler,
  reportFeedbackHandler,
  listFeedbackReportsHandler,
  reviewReportHandler,
} from '../controllers/feedback.controller.js';
import {
  feedbackIdParamSchema,
  reportIdParamSchema,
  listFeedbackQuerySchema,
  createFeedbackSchema,
  respondFeedbackSchema,
  moderateFeedbackSchema,
  updateFeedbackStatusSchema,
  createFeedbackReportSchema,
  reviewReportSchema,
} from '../validators/feedback.validator.js';

const router = Router();

// Require admin authentication for all feedback administrative endpoints
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/subadmin/feedback/statistics
 * @desc    Get aggregate feedback KPIs, ratings, NPS, and sentiment
 * @access  feedback:view
 */
router.get(
  '/statistics',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_VIEW),
  asyncHandler(getFeedbackStatisticsHandler)
);

/**
 * @route   GET /api/subadmin/feedback/reputation
 * @desc    Reputation breakdown & distribution alias
 * @access  feedback:view
 */
router.get(
  '/reputation',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_VIEW),
  asyncHandler(getFeedbackStatisticsHandler)
);

/**
 * @route   GET /api/subadmin/feedback/categories
 * @desc    Get active feedback categories
 * @access  feedback:view
 */
router.get(
  '/categories',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_VIEW),
  asyncHandler(listFeedbackCategoriesHandler)
);

/**
 * @route   GET /api/subadmin/feedback/reports
 * @desc    List moderation reports/flags
 * @access  feedback:manage_reports
 */
router.get(
  '/reports',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_MANAGE_REPORTS),
  asyncHandler(listFeedbackReportsHandler)
);

/**
 * @route   PATCH /api/subadmin/feedback/reports/:reportId
 * @desc    Review/dismiss moderation report
 * @access  feedback:manage_reports
 */
router.patch(
  '/reports/:reportId',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_MANAGE_REPORTS),
  validate({ params: reportIdParamSchema, body: reviewReportSchema }),
  asyncHandler(reviewReportHandler)
);

/**
 * @route   GET /api/subadmin/feedback
 * @desc    List feedback items with filters, search, and pagination
 * @access  feedback:view
 */
router.get(
  '/',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_VIEW),
  validate({ query: listFeedbackQuerySchema }),
  asyncHandler(listFeedbackHandler)
);

/**
 * @route   POST /api/subadmin/feedback
 * @desc    Submit a feedback record
 * @access  feedback:view
 */
router.post(
  '/',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_VIEW),
  validate({ body: createFeedbackSchema }),
  asyncHandler(createFeedbackHandler)
);

/**
 * @route   GET /api/subadmin/feedback/:id
 * @desc    Get feedback item details by ID
 * @access  feedback:view
 */
router.get(
  '/:id',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_VIEW),
  validate({ params: feedbackIdParamSchema }),
  asyncHandler(getFeedbackByIdHandler)
);

/**
 * @route   POST /api/subadmin/feedback/:id/responses
 * @desc    Publish an official subadmin/admin response
 * @access  feedback:respond
 */
router.post(
  '/:id/responses',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_RESPOND),
  validate({ params: feedbackIdParamSchema, body: respondFeedbackSchema }),
  asyncHandler(respondToFeedbackHandler)
);

/**
 * @route   POST /api/subadmin/feedback/:id/moderate
 * @desc    Apply atomic moderation action (PUBLISH, HIDE, REJECT, etc.)
 * @access  feedback:moderate
 */
router.post(
  '/:id/moderate',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_MODERATE),
  validate({ params: feedbackIdParamSchema, body: moderateFeedbackSchema }),
  asyncHandler(moderateFeedbackHandler)
);

/**
 * @route   PATCH /api/subadmin/feedback/:id/status
 * @desc    Update feedback lifecycle status
 * @access  feedback:moderate
 */
router.patch(
  '/:id/status',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_MODERATE),
  validate({ params: feedbackIdParamSchema, body: updateFeedbackStatusSchema }),
  asyncHandler(updateFeedbackStatusHandler)
);

/**
 * @route   POST /api/subadmin/feedback/:id/reports
 * @desc    Report an inappropriate feedback item
 * @access  feedback:view
 */
router.post(
  '/:id/reports',
  requirePermission(ADMIN_PERMISSIONS.FEEDBACK_VIEW),
  validate({ params: feedbackIdParamSchema, body: createFeedbackReportSchema }),
  asyncHandler(reportFeedbackHandler)
);

export default router;
