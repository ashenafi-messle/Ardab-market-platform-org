// ==============================================================================
// Ardab Market - Structured Logger Utility
// ==============================================================================
// Automatically scrubs sensitive fields (passwords, tokens, credentials) from logs.

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'authorization',
  'jwt_secret',
  'secret',
  'database_url',
  'direct_url',
  'cookie',
]);

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitize(meta);
  const metaString = Object.keys(sanitizedMeta).length ? ` | ${JSON.stringify(sanitizedMeta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
}

export const logger = {
  info: (message, meta = {}) => {
    console.log(formatLog('info', message, meta));
  },
  warn: (message, meta = {}) => {
    console.warn(formatLog('warn', message, meta));
  },
  error: (message, meta = {}) => {
    console.error(formatLog('error', message, meta));
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('debug', message, meta));
    }
  },
};
