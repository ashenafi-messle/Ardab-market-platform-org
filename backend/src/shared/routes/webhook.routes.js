// ==============================================================================
// Ardab Market - Public Payment Webhook Routes
// ==============================================================================

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chapaWebhookHandler } from '../controllers/webhook.controller.js';
import { paymentReturnCallbackHandler } from '../../customer/controllers/payment.controller.js';
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
  asyncHandler(chapaWebhookHandler)
);

/**
 * @route   GET /api/payments/chapa/callback
 * @desc    Public browser return callback for Chapa hosted checkout redirects
 * @access  Public (Browser navigation)
 */
router.get(
  '/callback',
  asyncHandler(paymentReturnCallbackHandler)
);

export default router;
