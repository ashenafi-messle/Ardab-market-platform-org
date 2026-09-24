// ==============================================================================
// Ardab Market - Telegram Bot Service (Backend-Only)
// ==============================================================================
// Securely encapsulates Telegram Bot API interactions for OTP & verification.
// The bot token is NEVER exposed to the frontend or bundled in the mobile app.

import { logger } from '../../utils/logger.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || null;
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'ArdabMarketBot';

export class TelegramService {
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
   * Sends 6-digit OTP verification message to a verified Telegram chat
   */
  static async sendOtpToTelegram({ chatId, otp, expiresMinutes = 5 }) {
    if (!TELEGRAM_BOT_TOKEN) {
      logger.info('Telegram Bot token not configured in environment. Using simulated delivery in development.');
      return { success: true, simulated: true };
    }

    try {
      const messageText = `🔐 *Ardab Market Verification Code*\n\nYour 6-digit verification code is:\n\`${otp}\`\n\n_This code is valid for ${expiresMinutes} minutes and can only be used once._\n\n⚠️ *Do not share this code with anyone.*`;

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'Markdown',
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        logger.error('Telegram Bot API error dispatching OTP:', { description: data.description });
        return { success: false, error: data.description };
      }

      return { success: true, messageId: data.result?.message_id };
    } catch (err) {
      logger.error('Failed to communicate with Telegram Bot API:', { error: err.message });
      return { success: false, error: err.message };
    }
  }
}
