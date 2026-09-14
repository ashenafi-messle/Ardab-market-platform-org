// ==============================================================================
// Ardab Market - Centralized Environment Configuration
// ==============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT, 10) || 5000;

const DATABASE_URL = process.env.DATABASE_URL || '';
const DIRECT_URL = process.env.DIRECT_URL || DATABASE_URL;

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_key_ardab_market_replace_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// Parse allowed CORS origins from comma-separated string
const rawCors = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001';
const CORS_ORIGINS = rawCors
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 mins
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100;
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10;

// Brevo Transactional Email Configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'no-reply@ardabmarket.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Ardab Market';
const BREVO_API_BASE_URL = process.env.BREVO_API_BASE_URL || 'https://api.brevo.com/v3';

// Frontend URL for password reset links
const ADMIN_FRONTEND_URL = process.env.ADMIN_FRONTEND_URL || 'http://localhost:3000';

// Warning if in production with insecure defaults
if (NODE_ENV === 'production') {
  if (!DATABASE_URL) {
    console.error('[CONFIG CRITICAL] DATABASE_URL is missing in production environment.');
  }
  if (JWT_SECRET.includes('dev_secret') || JWT_SECRET.length < 32) {
    console.error('[CONFIG CRITICAL] Insecure JWT_SECRET detected in production.');
  }
  if (!BREVO_API_KEY) {
    console.warn('[CONFIG WARNING] BREVO_API_KEY is not configured in production environment.');
  }
}

export const env = {
  NODE_ENV,
  IS_PRODUCTION: NODE_ENV === 'production',
  IS_DEVELOPMENT: NODE_ENV === 'development',
  IS_TEST: NODE_ENV === 'test',
  PORT,
  DATABASE_URL,
  DIRECT_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  CORS_ORIGINS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_MAX,
  BREVO_API_KEY,
  BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME,
  BREVO_API_BASE_URL,
  ADMIN_FRONTEND_URL,
};

