// ==============================================================================
// Ardab Market - Brevo Transactional Email Client
// ==============================================================================
// Isolated HTTP client calling Brevo v3 Transactional Email API (POST /v3/smtp/email).
// Ensures API key stays strictly backend-only, sanitizes provider errors,
// and supports mocked operation in test & development environments.

import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Sends a transactional email using Brevo v3 API
 * @param {Object} params
 * @param {string} params.toEmail Recipient email address
 * @param {string} [params.toName] Recipient display name
 * @param {string} params.subject Email subject
 * @param {string} params.htmlContent HTML format body
 * @param {string} [params.textContent] Plain text fallback body
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  // If in test environment or missing API key in dev, simulate email dispatch safely
  if (env.IS_TEST || !env.BREVO_API_KEY) {
    logger.info(`[BREVO MOCK] Transactional email simulated to ${toEmail} | Subject: "${subject}"`);
    return { success: true, messageId: `mock-msg-${Date.now()}` };
  }

  const endpoint = `${env.BREVO_API_BASE_URL.replace(/\/$/, '')}/smtp/email`;

  const payload = {
    sender: {
      name: env.BREVO_SENDER_NAME,
      email: env.BREVO_SENDER_EMAIL,
    },
    to: [
      {
        email: toEmail,
        name: toName || toEmail,
      },
    ],
    subject,
    htmlContent,
    textContent: textContent || htmlContent.replace(/<[^>]+>/g, ''),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Brevo API returned error status:', {
        statusCode: response.status,
        message: errorData.message || 'Unknown Brevo error',
      });
      return { success: false, error: 'Email service provider error' };
    }

    const data = await response.json();
    logger.info(`Email successfully dispatched via Brevo to ${toEmail}`, { messageId: data.messageId });
    return { success: true, messageId: data.messageId };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      logger.error('Brevo API request timed out (10000ms)');
      return { success: false, error: 'Email dispatch timed out' };
    }
    logger.error('Failed to communicate with Brevo API:', { error: error.message });
    return { success: false, error: error.message };
  }
}
