// ==============================================================================
// Ardab Market - Customer Support Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  listTickets,
  getTicketById,
  createTicket,
  replyToTicket,
  addInternalNote,
  updateTicketStatus,
  assignTicket,
  retryEmailDelivery,
  getSupportStatistics,
  listCategories,
} from '../services/support.service.js';

/**
 * GET /api/subadmin/support/tickets
 * List tickets with search, filters, pagination, and sorting.
 */
export async function listTicketsHandler(req, res) {
  const result = await listTickets(req.query, req.user);
  return ApiResponse.paginated(res, result.items, result.pagination, 'Support tickets retrieved successfully');
}

/**
 * GET /api/subadmin/support/statistics
 * Get summary counters and metrics for support dashboard.
 */
export async function getSupportStatisticsHandler(req, res) {
  const stats = await getSupportStatistics({ city: req.query?.city, adminUser: req.user });
  return ApiResponse.success(res, stats, 'Support statistics retrieved successfully');
}

/**
 * GET /api/subadmin/support/categories
 * List active support categories.
 */
export async function listCategoriesHandler(req, res) {
  const categories = await listCategories();
  return ApiResponse.success(res, categories, 'Support categories retrieved successfully');
}

/**
 * GET /api/subadmin/support/tickets/:id
 * Retrieve a support ticket by ID with full conversation, histories, and email logs.
 */
export async function getTicketByIdHandler(req, res) {
  const ticket = await getTicketById(req.params.id, req.user);
  return ApiResponse.success(res, ticket, 'Support ticket retrieved successfully');
}

/**
 * POST /api/subadmin/support/tickets
 * Create a new support ticket.
 */
export async function createTicketHandler(req, res) {
  const ticket = await createTicket(req.body, req.user);
  return ApiResponse.success(res, ticket, 'Support ticket created successfully', 201);
}

/**
 * POST /api/subadmin/support/tickets/:id/reply
 * Post an official admin reply and trigger customer notification email.
 */
export async function replyToTicketHandler(req, res) {
  const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotencyKey || null;
  const result = await replyToTicket(req.params.id, req.body, req.user, idempotencyKey);
  return ApiResponse.success(res, result, 'Reply sent and customer notified successfully');
}

/**
 * POST /api/subadmin/support/tickets/:id/internal-note
 * Post an internal team note (never emailed or exposed to customer).
 */
export async function addInternalNoteHandler(req, res) {
  const note = await addInternalNote(req.params.id, req.body, req.user);
  return ApiResponse.success(res, note, 'Internal note added successfully');
}

/**
 * PATCH /api/subadmin/support/tickets/:id/status
 * Transition ticket lifecycle status.
 */
export async function updateTicketStatusHandler(req, res) {
  const ticket = await updateTicketStatus(req.params.id, req.body, req.user);
  return ApiResponse.success(res, ticket, `Ticket status updated to ${req.body.status}`);
}

/**
 * PATCH /api/subadmin/support/tickets/:id/assign
 * Assign or reassign ticket to an admin user.
 */
export async function assignTicketHandler(req, res) {
  const ticket = await assignTicket(req.params.id, req.body, req.user);
  return ApiResponse.success(res, ticket, 'Ticket assigned successfully');
}

/**
 * POST /api/subadmin/support/tickets/:id/emails/:emailLogId/retry
 * Re-attempt failed email delivery.
 */
export async function retryEmailDeliveryHandler(req, res) {
  const result = await retryEmailDelivery(req.params.id, req.params.emailLogId, req.user);
  return ApiResponse.success(res, result, 'Email delivery re-attempted successfully');
}
