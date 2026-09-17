// ==============================================================================
// Ardab Market - Feedback & Reputation Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  listFeedback,
  getFeedbackById,
  createFeedback,
  respondToFeedback,
  moderateFeedback,
  updateFeedbackStatus,
  getFeedbackStatistics,
  listFeedbackCategories,
  reportFeedback,
  listFeedbackReports,
  reviewReport,
} from '../services/feedback.service.js';

/**
 * GET /api/subadmin/feedback
 * List feedback items with search, filters, and pagination.
 */
export async function listFeedbackHandler(req, res) {
  const result = await listFeedback(req.query);
  return ApiResponse.paginated(res, result.items, result.pagination, 'Feedback retrieved successfully');
}

/**
 * GET /api/subadmin/feedback/:id
 * Retrieve detailed feedback entry.
 */
export async function getFeedbackByIdHandler(req, res) {
  const feedback = await getFeedbackById(req.params.id);
  return ApiResponse.success(res, feedback, 'Feedback details retrieved successfully');
}

/**
 * POST /api/subadmin/feedback
 * Submit a customer feedback entry.
 */
export async function createFeedbackHandler(req, res) {
  const feedback = await createFeedback(req.body);
  return ApiResponse.success(res, feedback, 'Feedback submitted successfully', 201);
}

/**
 * POST /api/subadmin/feedback/:id/responses
 * Post an official administrative response to a review.
 */
export async function respondToFeedbackHandler(req, res) {
  const updatedFeedback = await respondToFeedback(req.params.id, req.body, req.user);
  return ApiResponse.success(res, updatedFeedback, 'Response published successfully');
}

/**
 * POST /api/subadmin/feedback/:id/moderate
 * Apply atomic moderation action (PUBLISH, HIDE, REJECT, RESOLVE, ARCHIVE, RESTORE).
 */
export async function moderateFeedbackHandler(req, res) {
  const updatedFeedback = await moderateFeedback(req.params.id, req.body, req.user);
  return ApiResponse.success(res, updatedFeedback, `Moderation action '${req.body.action}' applied successfully`);
}

/**
 * PATCH /api/subadmin/feedback/:id/status
 * Transition feedback lifecycle status.
 */
export async function updateFeedbackStatusHandler(req, res) {
  const updatedFeedback = await updateFeedbackStatus(req.params.id, req.body.status, req.body.reason, req.user);
  return ApiResponse.success(res, updatedFeedback, `Feedback status updated to ${req.body.status}`);
}

/**
 * GET /api/subadmin/feedback/statistics & /api/subadmin/feedback/reputation
 * Aggregate platform reputation metrics, ratings distribution, and NPS.
 */
export async function getFeedbackStatisticsHandler(req, res) {
  const stats = await getFeedbackStatistics(req.query);
  return ApiResponse.success(res, stats, 'Reputation statistics calculated successfully');
}

/**
 * GET /api/subadmin/feedback/categories
 * List active feedback categories.
 */
export async function listFeedbackCategoriesHandler(req, res) {
  const categories = await listFeedbackCategories();
  return ApiResponse.success(res, categories, 'Feedback categories retrieved successfully');
}

/**
 * POST /api/subadmin/feedback/:id/reports
 * Flag or report an inappropriate feedback entry.
 */
export async function reportFeedbackHandler(req, res) {
  const report = await reportFeedback(req.params.id, req.body);
  return ApiResponse.success(res, report, 'Feedback reported successfully', 201);
}

/**
 * GET /api/subadmin/feedback/reports
 * List reported feedback items in moderation queue.
 */
export async function listFeedbackReportsHandler(req, res) {
  const result = await listFeedbackReports(req.query);
  return ApiResponse.paginated(res, result.items, result.pagination, 'Feedback reports retrieved successfully');
}

/**
 * PATCH /api/subadmin/feedback/reports/:reportId
 * Review and resolve a moderation report.
 */
export async function reviewReportHandler(req, res) {
  const report = await reviewReport(req.params.reportId, req.body, req.user);
  return ApiResponse.success(res, report, `Report reviewed with action: ${req.body.action}`);
}
