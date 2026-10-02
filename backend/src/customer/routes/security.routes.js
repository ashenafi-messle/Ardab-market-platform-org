// ==============================================================================
// Ardab Market - Customer Security Routes
// ==============================================================================

import { Router } from 'express';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  changePasswordHandler,
  listSessionsHandler,
  revokeSessionHandler,
  revokeOtherSessionsHandler,
  requestDeletionHandler,
  getDeletionStatusHandler,
} from '../controllers/security.controller.js';

const router = Router();

// All security routes require authenticated customer
router.use(customerAuthMiddleware);

/**
 * @route   PATCH /api/customer/security/password
 * @desc    Change customer account password
 */
router.patch('/password', asyncHandler(changePasswordHandler));

/**
 * @route   GET /api/customer/security/sessions
 * @desc    List active sessions
 */
router.get('/sessions', asyncHandler(listSessionsHandler));

/**
 * @route   DELETE /api/customer/security/sessions/:sessionId
 * @desc    Revoke specific session
 */
router.delete('/sessions/:sessionId', asyncHandler(revokeSessionHandler));

/**
 * @route   POST /api/customer/security/sessions/revoke-others
 * @desc    Sign out all other devices
 */
router.post('/sessions/revoke-others', asyncHandler(revokeOtherSessionsHandler));

/**
 * @route   GET /api/customer/security/delete-account
 * @desc    Get account deletion request status
 */
router.get('/delete-account', asyncHandler(getDeletionStatusHandler));
router.get('/account/deletion-request', asyncHandler(getDeletionStatusHandler));

/**
 * @route   POST /api/customer/security/delete-account
 * @desc    Submit account deletion request
 */
router.post('/delete-account', asyncHandler(requestDeletionHandler));
router.post('/account/deletion-request', asyncHandler(requestDeletionHandler));

export default router;
