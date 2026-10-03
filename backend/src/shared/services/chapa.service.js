// ==============================================================================
// Ardab Market - Chapa Payment Provider Integration Service
// ==============================================================================
// Handles server-to-server communication with Chapa Payment API.
// Features:
// - Explicit HTTP timeout with AbortController (10s default)
// - Cryptographically secure HMAC-SHA256 webhook signature verification
// - Server-side transaction verification
// - Never logs or exposes secret keys or sensitive customer credentials
// ==============================================================================

import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class ChapaService {
  constructor(config = {}) {
    this.baseUrl = (config.baseUrl || env.CHAPA_BASE_URL || 'https://api.chapa.co').replace(/\/+$/, '');
    this.secretKey = config.secretKey || env.CHAPA_SECRET_KEY || '';
    this.webhookSecretHash = config.webhookSecretHash || env.CHAPA_WEBHOOK_SECRET_HASH || '';
    this.timeoutMs = config.timeoutMs || 12000; // 12 seconds timeout
  }

  /**
   * Internal helper for executing fetch requests with timeout and error handling.
   *
   * @param {string} endpoint - API endpoint path
   * @param {object} options - Fetch options
   * @returns {Promise<any>}
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.secretKey}`,
      ...(options.headers || {}),
    };

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const durationMs = Date.now() - startTime;
      const responseText = await response.text();
      let responseData = null;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (!response.ok) {
        logger.error(`[ChapaService] HTTP ${response.status} from ${endpoint}`, {
          status: response.status,
          durationMs,
          message: responseData?.message || response.statusText,
        });

        const error = new Error(
          responseData?.message || `Chapa API responded with status ${response.status}`
        );
        error.status = response.status;
        error.code = 'PROVIDER_HTTP_ERROR';
        error.data = responseData;
        throw error;
      }

      logger.info(`[ChapaService] Success ${options.method || 'GET'} ${endpoint}`, {
        status: response.status,
        durationMs,
      });

      return responseData;
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.error(`[ChapaService] Request timed out after ${this.timeoutMs}ms for ${endpoint}`);
        const timeoutError = new Error('Chapa API request timed out. Please try again.');
        timeoutError.code = 'PROVIDER_TIMEOUT';
        throw timeoutError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Initialize a hosted payment checkout session on Chapa.
   *
   * @param {object} params
   * @param {string|number} params.amount - Total authoritative amount in ETB
   * @param {string} params.currency - Must be 'ETB'
   * @param {string} params.email - Customer email
   * @param {string} params.firstName - Customer first name
   * @param {string} params.lastName - Customer last name
   * @param {string} [params.phoneNumber] - Customer phone
   * @param {string} params.txRef - Server-generated unique transaction reference
   * @param {string} [params.callbackUrl] - Public webhook URL
   * @param {string} [params.returnUrl] - Mobile deep link or web return URL
   * @param {object} [params.customization] - Title and description
   * @returns {Promise<{ checkoutUrl: string, raw: object }>}
   */
  async initializeTransaction({
    amount,
    currency = 'ETB',
    email,
    firstName,
    lastName,
    phoneNumber,
    txRef,
    callbackUrl,
    returnUrl,
    customization,
  }) {
    if (!this.secretKey) {
      throw new Error('CHAPA_SECRET_KEY is not configured on the backend.');
    }

    const payload = {
      amount: String(amount),
      currency: currency.toUpperCase(),
      email: email || 'customer@ardabmarket.com',
      first_name: (firstName || 'Customer').trim(),
      last_name: (lastName || 'Shopper').trim(),
      tx_ref: txRef,
      callback_url: callbackUrl || env.CHAPA_WEBHOOK_URL,
      return_url: returnUrl || `${env.CHAPA_RETURN_URL_SCHEME}?tx_ref=${encodeURIComponent(txRef)}`,
    };

    if (phoneNumber) {
      payload.phone_number = phoneNumber;
    }

    if (customization) {
      payload.customization = customization;
    }

    logger.info('[ChapaService] Initializing checkout session', {
      txRef,
      amount: payload.amount,
      currency: payload.currency,
    });

    const response = await this._request('/v1/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Chapa returns { status: 'success', data: { checkout_url: '...' } }
    const checkoutUrl = response?.data?.checkout_url;

    if (!checkoutUrl) {
      logger.error('[ChapaService] Checkout URL missing in Chapa response', { response });
      const error = new Error('Chapa initialization failed: checkout URL not returned.');
      error.code = 'PROVIDER_INITIALIZATION_FAILED';
      error.data = response;
      throw error;
    }

    return {
      checkoutUrl,
      raw: response,
    };
  }

  /**
   * Authoritatively verify transaction status with Chapa server-to-server.
   *
   * @param {string} txRef - The unique transaction reference
   * @returns {Promise<{
   *   isSuccess: boolean,
   *   status: string,
   *   amount: string,
   *   currency: string,
   *   reference: string,
   *   txRef: string,
   *   paymentMethod: string,
   *   raw: object
   * }>}
   */
  async verifyTransaction(txRef) {
    if (!this.secretKey) {
      throw new Error('CHAPA_SECRET_KEY is not configured on the backend.');
    }

    if (!txRef) {
      throw new Error('Transaction reference (txRef) is required for verification.');
    }

    logger.info('[ChapaService] Server-to-server verification request', { txRef });

    const response = await this._request(`/v1/transaction/verify/${encodeURIComponent(txRef)}`, {
      method: 'GET',
    });

    const data = response?.data || {};
    const rawStatus = (data.status || response.status || '').toLowerCase();
    const isSuccess = rawStatus === 'success';

    let paymentMethod = 'UNKNOWN';
    const methodStr = (data.method || '').toLowerCase();
    if (methodStr.includes('telebirr')) paymentMethod = 'TELEBIRR';
    else if (methodStr.includes('cbe')) paymentMethod = 'CBEBIRR';
    else if (methodStr.includes('card') || methodStr.includes('visa') || methodStr.includes('master')) paymentMethod = 'CARD';
    else if (methodStr.includes('bank')) paymentMethod = 'BANK';
    else if (methodStr) paymentMethod = 'OTHER';

    return {
      isSuccess,
      status: isSuccess ? 'SUCCESS' : rawStatus.toUpperCase() || 'FAILED',
      amount: data.amount != null ? String(data.amount) : null,
      currency: (data.currency || 'ETB').toUpperCase(),
      reference: data.reference || data.chapa_reference || null,
      txRef: data.tx_ref || txRef,
      paymentMethod,
      raw: data,
    };
  }

  /**
   * Cryptographically verify Chapa webhook authenticity.
   * Supports:
   * 1. HMAC-SHA256 signature in 'x-chapa-signature' or 'chapa-signature'
   * 2. Secret hash header matching 'chapa-secret-hash' or payload secret_hash
   *
   * @param {string|Buffer} rawBody - Raw body buffer/string
   * @param {object} headers - HTTP request headers
   * @returns {boolean}
   */
  verifyWebhookSignature(rawBody, headers = {}) {
    if (!this.webhookSecretHash) {
      logger.warn('[ChapaService] CHAPA_WEBHOOK_SECRET_HASH is empty; cannot verify webhook signature.');
      return false;
    }

    const signature =
      headers['x-chapa-signature'] ||
      headers['chapa-signature'] ||
      headers['X-Chapa-Signature'] ||
      '';

    const secretHashHeader =
      headers['chapa-secret-hash'] ||
      headers['x-chapa-secret-hash'] ||
      headers['Chapa-Secret-Hash'] ||
      '';

    // 1. Direct Secret Hash match (if Chapa sends static secret-hash header)
    if (secretHashHeader) {
      const headerBuf = Buffer.from(secretHashHeader);
      const secretBuf = Buffer.from(this.webhookSecretHash);
      if (headerBuf.length === secretBuf.length && crypto.timingSafeEqual(headerBuf, secretBuf)) {
        return true;
      }
    }

    // 2. HMAC SHA-256 Signature verification
    if (signature && rawBody) {
      try {
        const bodyContent = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
        const expectedSignature = crypto
          .createHmac('sha256', this.webhookSecretHash)
          .update(bodyContent)
          .digest('hex');

        const sigBuf = Buffer.from(signature.toLowerCase());
        const expBuf = Buffer.from(expectedSignature.toLowerCase());

        if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
          return true;
        }
      } catch (err) {
        logger.error('[ChapaService] Error computing HMAC signature', { error: err.message });
      }
    }

    return false;
  }
}

export const chapaService = new ChapaService();
