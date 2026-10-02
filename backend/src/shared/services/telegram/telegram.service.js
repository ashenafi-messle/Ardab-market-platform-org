// ==============================================================================
// Ardab Market - Telegram Bot Service (Backend-Only)
// ==============================================================================
// Securely encapsulates Telegram Bot API interactions for OTP & verification.
// The bot token is NEVER exposed to the frontend or bundled in the mobile app.

import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import { generateNumericOtp, hashToken } from '../../utils/crypto.js';

const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || null;
const TELEGRAM_BOT_USERNAME = env.TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || 'Ardab_market_bot';
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const OTP_EXPIRY_MINUTES = 5;
const COOLDOWN_SECONDS = 60;

export class TelegramService {
  static isPollingActive = false;
  static pollingTimeoutRef = null;
  static currentPollOffset = 0;

  /**
   * Returns public bot details (safe for client consumption)
   */
  static getBotInfo() {
    return {
      username: TELEGRAM_BOT_USERNAME,
      url: `https://t.me/${TELEGRAM_BOT_USERNAME}`,
      isConfigured: Boolean(TELEGRAM_BOT_TOKEN),
    };
  }

  /**
   * Generic Telegram sendMessage wrapper with safe error inspection
   */
  static async sendMessage(chatId, text, options = {}) {
    if (!TELEGRAM_BOT_TOKEN) {
      logger.warn('[Telegram Bot] Bot token not configured. Message delivery skipped.');
      return { success: false, error: 'TELEGRAM_TOKEN_NOT_CONFIGURED' };
    }

    try {
      const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options.parseMode || 'Markdown',
          disable_web_page_preview: true,
          ...options,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        logger.warn('[Telegram Bot] Telegram API error sending message:', {
          status: response.status,
          description: data.description,
          chatId: String(chatId),
        });
        return { success: false, error: data.description || 'TELEGRAM_API_ERROR' };
      }

      return { success: true, messageId: data.result?.message_id };
    } catch (err) {
      logger.error('[Telegram Bot] Network error sending Telegram message:', {
        error: err.message,
        chatId: String(chatId),
      });
      return { success: false, error: err.message };
    }
  }

  /**
   * Formats and delivers OTP verification message to Telegram user
   */
  static async sendOtpMessage(chatId, otp, expiresMinutes = OTP_EXPIRY_MINUTES) {
    const message = [
      'Welcome to Ardab Market! 🛍️',
      '',
      'Your verification code is:',
      `*${otp}*`,
      '',
      'Enter this code manually in the Ardab Market app.',
      `This code expires in ${expiresMinutes} minutes.`,
      '',
      'Do not share this code with anyone.',
    ].join('\n');

    return this.sendMessage(chatId, message);
  }

  /**
   * Handles Telegram /start command (deep link or generic)
   * Connects pending mobile signup session with Telegram user/chat ID
   */
  /**
   * Handles Telegram /start command (deep link or generic)
   * Connects pending mobile signup session with Telegram user/chat ID
   */
  static async handleStartCommand({ chatId, userId, token, username = null }) {
    const cleanToken = token ? String(token).trim() : null;

    // Case 1: Customer opened the bot without a start token
    if (!cleanToken) {
      logger.info('[Telegram Signup] telegramStartReceived=true, hasToken=false', {
        chatId: String(chatId),
      });

      const message = [
        'Welcome to Ardab Market! 🛍️',
        '',
        'To receive your verification code, please start registration from the Ardab Market mobile app.',
      ].join('\n');

      await this.sendMessage(chatId, message);
      return { success: true, reason: 'NO_TOKEN' };
    }

    logger.info('[Telegram Signup] telegramStartReceived=true, hasToken=true', {
      chatId: String(chatId),
    });

    const tokenHash = hashToken(cleanToken);

    // Primary: Locate session in telegramSignupSession by tokenHash
    let session = await prisma.telegramSignupSession.findUnique({
      where: { tokenHash },
    });

    // Fallback: Check legacy customerMobileOtp
    let legacyOtpRecord = null;
    if (!session) {
      legacyOtpRecord = await prisma.customerMobileOtp.findFirst({
        where: { OR: [{ telegramToken: cleanToken }, { codeHash: tokenHash }] },
      });
    }

    if (!session && !legacyOtpRecord) {
      logger.warn('[Telegram Signup] startTokenValid=false (not found)', {
        chatId: String(chatId),
      });

      const message = [
        'This verification link is invalid or unrecognized.',
        '',
        "Please return to the Ardab Market app and tap 'Continue with Telegram' again to generate a new verification link.",
      ].join('\n');

      await this.sendMessage(chatId, message);
      return { success: false, reason: 'TOKEN_NOT_FOUND' };
    }

    const now = Date.now();

    // --------------------------------------------------------------------------
    // Branch A: Modern TelegramSignupSession
    // --------------------------------------------------------------------------
    if (session) {
      if (session.status === 'VERIFIED') {
        logger.warn('[Telegram Signup] startTokenValid=false (already verified)', {
          chatId: String(chatId),
          sessionId: session.id,
        });

        const message = [
          'This verification session has already been completed.',
          '',
          'Please return to the Ardab Market app to continue.',
        ].join('\n');

        await this.sendMessage(chatId, message);
        return { success: false, reason: 'ALREADY_CONSUMED' };
      }

      if (new Date(session.expiresAt).getTime() < now || session.status === 'EXPIRED') {
        logger.warn('[Telegram Signup] startTokenValid=false (session expired)', {
          chatId: String(chatId),
          sessionId: session.id,
        });

        await prisma.telegramSignupSession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        }).catch(() => {});

        const message = [
          'This verification session has expired.',
          '',
          "Please return to the Ardab Market app and tap 'Continue with Telegram' to request a new code.",
        ].join('\n');

        await this.sendMessage(chatId, message);
        return { success: false, reason: 'EXPIRED' };
      }

      // Rate limiting / Cooldown protection (60s)
      if (session.telegramChatId === String(chatId) && session.lastResentAt) {
        const secondsSinceLastOtp = (now - new Date(session.lastResentAt).getTime()) / 1000;
        if (secondsSinceLastOtp < COOLDOWN_SECONDS) {
          const remainingSeconds = Math.ceil(COOLDOWN_SECONDS - secondsSinceLastOtp);
          logger.info('[Telegram Signup] rateLimitCooldown=true', {
            chatId: String(chatId),
            remainingSeconds,
          });

          const message = [
            'Please wait before requesting another verification code.',
            `You can request a new code in ${remainingSeconds} seconds.`,
          ].join('\n');

          await this.sendMessage(chatId, message);
          return { success: false, reason: 'COOLDOWN' };
        }
      }

      // Generate cryptographically secure 6-digit numeric OTP
      const rawOtp = generateNumericOtp();
      const otpHash = hashToken(rawOtp);
      const otpExpiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);

      // Save OTP hash, expiration, and Telegram identity in database
      await prisma.telegramSignupSession.update({
        where: { id: session.id },
        data: {
          telegramChatId: String(chatId),
          telegramUserId: String(userId),
          telegramUsername: username || null,
          otpHash,
          otpExpiresAt,
          otpAttempts: 0,
          status: 'OTP_SENT',
          lastResentAt: new Date(),
        },
      });

      logger.info('[Telegram Signup] startTokenValid=true, telegramUserLinked=true, otpGenerated=true, otpSaved=true', {
        chatId: String(chatId),
        sessionId: session.id,
      });

      // Deliver OTP to Telegram chat
      const sendResult = await this.sendOtpMessage(chatId, rawOtp, OTP_EXPIRY_MINUTES);

      if (!sendResult.success) {
        logger.error('[Telegram Signup] telegramMessageSent=false', {
          chatId: String(chatId),
          error: sendResult.error,
        });
        await prisma.telegramSignupSession.update({
          where: { id: session.id },
          data: { status: 'FAILED' },
        }).catch(() => {});
        return { success: false, error: sendResult.error };
      }

      logger.info('[Telegram Signup] telegramMessageSent=true', {
        chatId: String(chatId),
        messageId: sendResult.messageId,
      });

      return { success: true };
    }

    // --------------------------------------------------------------------------
    // Branch B: Legacy CustomerMobileOtp compatibility
    // --------------------------------------------------------------------------
    const otpRecord = legacyOtpRecord;
    if (otpRecord.isVerified || otpRecord.consumedAt) {
      const message = [
        'This verification session has already been used or expired.',
        '',
        'Please start a new registration from the Ardab Market app.',
      ].join('\n');
      await this.sendMessage(chatId, message);
      return { success: false, reason: 'ALREADY_CONSUMED' };
    }

    if (new Date(otpRecord.expiresAt).getTime() < now) {
      const message = [
        'This verification session has expired.',
        '',
        "Please return to the Ardab Market app and tap 'Continue with Telegram' to request a new code.",
      ].join('\n');
      await this.sendMessage(chatId, message);
      return { success: false, reason: 'EXPIRED' };
    }

    const rawOtp = generateNumericOtp();
    const codeHash = hashToken(rawOtp);
    const otpExpiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.customerMobileOtp.update({
      where: { id: otpRecord.id },
      data: {
        codeHash,
        expiresAt: otpExpiresAt,
        telegramChatId: String(chatId),
        attempts: 0,
        updatedAt: new Date(),
      },
    });

    const sendResult = await this.sendOtpMessage(chatId, rawOtp, OTP_EXPIRY_MINUTES);
    if (!sendResult.success) {
      return { success: false, error: sendResult.error };
    }

    return { success: true };
  }

  /**
   * Processes incoming Telegram update (from Webhook or Polling)
   */
  static async handleTelegramUpdate(update) {
    if (!update || typeof update !== 'object') {
      return { handled: false, error: 'INVALID_UPDATE' };
    }

    const message = update.message || update.edited_message;
    if (!message || !message.text) {
      return { handled: false, reason: 'NO_TEXT_MESSAGE' };
    }

    const chatId = message.chat?.id;
    const userId = message.from?.id;
    const username = message.from?.username || null;
    const text = message.text.trim();

    if (!chatId) {
      return { handled: false, reason: 'NO_CHAT_ID' };
    }

    // Match /start or /start <token> or /start@Ardab_market_bot <token>
    const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);

    if (startMatch) {
      const token = startMatch[1] ? startMatch[1].trim() : null;
      return this.handleStartCommand({ chatId, userId, token, username });
    }

    // Generic response for unexpected text messages
    const fallbackMessage = [
      'Welcome to Ardab Market! 🛍️',
      '',
      'To browse products, place orders, or manage your account, please open the Ardab Market mobile application.',
    ].join('\n');

    await this.sendMessage(chatId, fallbackMessage);
    return { handled: true, reason: 'GENERIC_COMMAND' };
  }

  // ----------------------------------------------------------------------------
  // Webhook Management
  // ----------------------------------------------------------------------------

  /**
   * Checks current registered Telegram webhook status
   */
  static async getWebhookInfo() {
    if (!TELEGRAM_BOT_TOKEN) return null;
    try {
      const response = await fetch(`${TELEGRAM_API_BASE}/getWebhookInfo`);
      const data = await response.json();
      return data.result || null;
    } catch (err) {
      logger.error('[Telegram Bot] Failed to fetch webhook info:', { error: err.message });
      return null;
    }
  }

  /**
   * Registers webhook URL with Telegram
   */
  static async setupWebhook(webhookUrl, secretToken) {
    if (!TELEGRAM_BOT_TOKEN) return false;
    try {
      const body = {
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: false,
      };
      if (secretToken) {
        body.secret_token = secretToken;
      }

      const response = await fetch(`${TELEGRAM_API_BASE}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.ok) {
        logger.info(`[Telegram Bot] Webhook registered successfully at: ${webhookUrl}`);
        return true;
      } else {
        logger.warn('[Telegram Bot] Failed to set webhook:', { description: data.description });
        return false;
      }
    } catch (err) {
      logger.error('[Telegram Bot] Error setting webhook:', { error: err.message });
      return false;
    }
  }

  /**
   * Deletes registered webhook from Telegram
   */
  static async deleteWebhook(dropPendingUpdates = false) {
    if (!TELEGRAM_BOT_TOKEN) return false;
    try {
      const response = await fetch(`${TELEGRAM_API_BASE}/deleteWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drop_pending_updates: dropPendingUpdates }),
      });
      const data = await response.json();
      return Boolean(data.ok);
    } catch (err) {
      logger.error('[Telegram Bot] Error deleting webhook:', { error: err.message });
      return false;
    }
  }

  // ----------------------------------------------------------------------------
  // Long Polling Mode (for Development or when Webhook is not configured)
  // ----------------------------------------------------------------------------

  /**
   * Starts background long polling loop for updates
   */
  static async startPolling() {
    if (!TELEGRAM_BOT_TOKEN) {
      logger.info('[Telegram Bot] Token not configured. Polling not started.');
      return;
    }

    if (this.isPollingActive) {
      logger.info('[Telegram Bot] Polling is already running.');
      return;
    }

    // Ensure any stale webhook is deleted before polling begins
    await this.deleteWebhook(false).catch(() => {});

    this.isPollingActive = true;
    logger.info('[Telegram Bot] Starting Telegram getUpdates long-polling loop...');

    const pollLoop = async () => {
      if (!this.isPollingActive) return;

      try {
        const url = `${TELEGRAM_API_BASE}/getUpdates?offset=${this.currentPollOffset}&timeout=25&allowed_updates=["message"]`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.currentPollOffset = update.update_id + 1;
            try {
              await this.handleTelegramUpdate(update);
            } catch (updateErr) {
              logger.error('[Telegram Bot] Error processing polled update:', {
                error: updateErr.message,
                updateId: update.update_id,
              });
            }
          }
        } else if (!data.ok) {
          logger.warn('[Telegram Bot] getUpdates error response:', { description: data.description });
          // If conflict or error, back off briefly
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      } catch (pollErr) {
        logger.error('[Telegram Bot] Network error during polling cycle:', { error: pollErr.message });
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (this.isPollingActive) {
        this.pollingTimeoutRef = setTimeout(pollLoop, 500);
      }
    };

    pollLoop();
  }

  /**
   * Stops background polling cleanly on server shutdown
   */
  static stopPolling() {
    this.isPollingActive = false;
    if (this.pollingTimeoutRef) {
      clearTimeout(this.pollingTimeoutRef);
      this.pollingTimeoutRef = null;
    }
    logger.info('[Telegram Bot] Polling loop stopped.');
  }

  // ----------------------------------------------------------------------------
  // Lifecycle Initialization
  // ----------------------------------------------------------------------------

  /**
   * Initializes Telegram Bot integration on application startup
   */
  static async initialize() {
    if (!TELEGRAM_BOT_TOKEN) {
      logger.info('[Telegram Bot] No TELEGRAM_BOT_TOKEN found. Telegram auth features disabled.');
      return;
    }

    const webhookUrl = env.TELEGRAM_WEBHOOK_URL || process.env.TELEGRAM_WEBHOOK_URL;
    const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;
    const mode = env.TELEGRAM_MODE || process.env.TELEGRAM_MODE;

    // Use Webhook if configured in production, or if mode is explicitly 'webhook'
    const useWebhook =
      mode === 'webhook' ||
      (env.IS_PRODUCTION && webhookUrl && webhookUrl.startsWith('https://') && mode !== 'polling');

    if (useWebhook && webhookUrl) {
      logger.info(`[Telegram Bot] Initializing in WEBHOOK mode at ${webhookUrl}`);
      await this.setupWebhook(webhookUrl, webhookSecret);
    } else {
      logger.info('[Telegram Bot] Initializing in POLLING mode (development / local fallback)');
      await this.startPolling();
    }
  }
}
