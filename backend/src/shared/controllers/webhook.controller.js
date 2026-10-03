// ==============================================================================
// Ardab Market - Chapa Webhook Controller
// ==============================================================================
// Publicly reachable, signature-verified, idempotent payment webhook processor.
// ==============================================================================

import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { chapaService } from '../services/chapa.service.js';
import { paymentService } from '../../customer/services/payment.service.js';

export async function chapaWebhookHandler(req, res) {
  const startTime = Date.now();
  const rawBody = req.rawBody || JSON.stringify(req.body);

  // 1. Cryptographic Signature & Secret Verification
  const isVerified = chapaService.verifyWebhookSignature(rawBody, req.headers);

  if (!isVerified) {
    logger.warn('[ChapaWebhook] Unauthorized webhook rejected: invalid signature or secret hash', {
      headers: {
        signature: req.headers['x-chapa-signature'] ? 'present' : 'missing',
        secretHash: req.headers['chapa-secret-hash'] ? 'present' : 'missing',
      },
    });

    return res.status(401).json({
      status: 'error',
      message: 'Invalid webhook signature or secret hash.',
    });
  }

  // 2. Extract Event Data & Transaction Reference
  const payload = req.body || {};
  const txRef =
    payload.tx_ref ||
    payload.trx_ref ||
    payload.data?.tx_ref ||
    payload.reference;

  const eventType = payload.event || payload.type || 'charge.complete';

  // 3. Deterministic Idempotency Key & Payload Hash
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const eventId =
    payload.id ||
    req.headers['x-chapa-event-id'] ||
    `FPRINT-${txRef || 'NOTX'}-${payloadHash.slice(0, 16)}`;

  // 4. Check for duplicate webhook processing
  const existingEvent = await prisma.paymentWebhookEvent.findFirst({
    where: {
      OR: [
        { eventId },
        { payloadHash },
      ],
    },
  });

  if (existingEvent && existingEvent.processingStatus === 'PROCESSED') {
    logger.info('[ChapaWebhook] Duplicate webhook event detected; acknowledging idempotently', {
      eventId,
      txRef,
    });
    return res.status(200).json({
      status: 'success',
      message: 'Webhook already processed.',
    });
  }

  // 5. Upsert Webhook Event tracking record
  let webhookRecord;
  try {
    webhookRecord = await prisma.paymentWebhookEvent.upsert({
      where: { eventId },
      create: {
        provider: 'CHAPA',
        eventId,
        txRef: txRef || null,
        eventType,
        payloadHash,
        processingStatus: 'PENDING',
        receivedAt: new Date(),
      },
      update: {
        receivedAt: new Date(),
      },
    });
  } catch (err) {
    logger.warn('[ChapaWebhook] Failed to persist initial webhook event record:', err.message);
  }

  if (!txRef) {
    logger.error('[ChapaWebhook] Webhook payload missing transaction reference (tx_ref)', { payload });
    if (webhookRecord) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          processingStatus: 'FAILED',
          errorMessage: 'Missing transaction reference in payload.',
          processedAt: new Date(),
        },
      }).catch(() => {});
    }
    return res.status(400).json({
      status: 'error',
      message: 'Transaction reference is missing in webhook payload.',
    });
  }

  // 6. Server-to-server Chapa verification and atomic state update
  // CRITICAL: Webhook NEVER marks payment success blindly without server-to-server verification!
  try {
    const finalized = await paymentService.finalizePaymentWithVerification(txRef, {
      actorType: 'WEBHOOK',
      actorId: eventId,
    });

    // Mark webhook event PROCESSED
    if (webhookRecord) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
          txRef,
        },
      }).catch(() => {});
    }

    const durationMs = Date.now() - startTime;
    logger.info('[ChapaWebhook] Webhook processed successfully', {
      txRef,
      status: finalized.status,
      durationMs,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Webhook processed and verified successfully.',
      data: {
        txRef,
        status: finalized.status,
      },
    });
  } catch (err) {
    logger.error('[ChapaWebhook] Error processing webhook verification', {
      txRef,
      error: err.message,
    });

    if (webhookRecord) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          processingStatus: 'FAILED',
          errorMessage: err.message,
          processedAt: new Date(),
        },
      }).catch(() => {});
    }

    // Return 500 so provider retries transient failures if appropriate
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Error verifying webhook transaction.',
    });
  }
}
