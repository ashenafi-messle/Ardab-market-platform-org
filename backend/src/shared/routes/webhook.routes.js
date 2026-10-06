// ==============================================================================
// Ardab Market - Public Payment Webhook Routes
// ==============================================================================

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  chapaCallbackHandler,
  chapaReturnHandler,
} from '../../customer/controllers/payment.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * Controlled rate limiter for provider webhooks:
 * Prevents DDoS while safely allowing high burst traffic and retries from Chapa servers.
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // Up to 120 requests per minute
  message: {
    status: 'error',
    message: 'Webhook rate limit exceeded. Please retry with standard backoff.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/payments/chapa/webhook
 * @desc    Public webhook callback for Chapa payment events
 * @access  Public (Signature verification enforced)
 */
router.post(
  '/webhook',
  webhookLimiter,
  asyncHandler(chapaCallbackHandler)
);

/**
 * @route   ALL /api/payments/chapa/callback
 * @desc    Server-side callback handling for Chapa
 * @access  Public
 */
router.all(
  '/callback',
  asyncHandler(chapaCallbackHandler)
);

/**
 * @route   GET /api/payments/chapa/return
 * @desc    Central HTTPS return gateway for browser redirects from Chapa
 * @access  Public
 */
router.get(
  '/return',
  asyncHandler(chapaReturnHandler)
);

export default router;
