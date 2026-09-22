// ==============================================================================
// Ardab Market - In-Memory Cache & HTTP Cache-Control Middleware
// ==============================================================================
// Caches public, non-customer-sensitive data (categories, cities, payment methods)
// Provides instant (<5ms) sub-second responses and adds HTTP cache headers.
// Strictly NEVER caches authenticated or customer-specific private requests.

import { logger } from '../utils/logger.js';

class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key, data, ttlSeconds) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  invalidate(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.info(`Invalidated ${count} cache entries matching ${pattern}`);
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const memoryCache = new MemoryCache();

/**
 * Express middleware to cache safe public GET requests with HTTP Cache-Control headers
 *
 * @param {number} ttlSeconds Time-to-live in seconds (default 300s / 5m)
 * @param {function} keyGenerator Custom key generator
 */
export function publicApiCache(ttlSeconds = 300, keyGenerator = null) {
  return (req, res, next) => {
    // Only cache GET requests without Authorization headers (public only)
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }

    const cacheKey = keyGenerator ? keyGenerator(req) : `cache:${req.originalUrl || req.url}`;
    const cachedBody = memoryCache.get(cacheKey);

    if (cachedBody) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`);
      return res.status(200).json(cachedBody);
    }

    // Intercept res.json to store into memory cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful 200 responses
      if (res.statusCode === 200 && body && body.success !== false) {
        memoryCache.set(cacheKey, body, ttlSeconds);
      }
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`);
      return originalJson(body);
    };

    next();
  };
}
