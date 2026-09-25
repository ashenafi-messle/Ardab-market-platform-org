// ==============================================================================
// Ardab Market - Centralized High-Performance Mobile API Client
// ==============================================================================
// - Centralized API client with base URL from NEXT_PUBLIC_API_URL / EXPO_PUBLIC_API_URL
// - Automatic authentication header attachment via secureStorage
// - In-flight request deduplication (request coalescing) to eliminate duplicate network calls
// - Safe retry logic ONLY for read-only GET requests (never duplicate mutations/orders)
// - Fast timeout (12s) to prevent frozen screens with AbortController cancellation
// - Integrated performance instrumentation
// ==============================================================================

import { secureStorage } from '@/services/secureStorage';
import { perfMonitor } from '@/utils/perfMonitor';

// Resolve base URL from environment (supporting NEXT_PUBLIC_API_URL and EXPO_PUBLIC_API_URL)
const resolvedApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://ardab-market-platform-org.onrender.com/api';

const resolvedRootUrl = resolvedApiUrl.replace(/\/api\/?$/, '');

export const API_CONFIG = {
  BASE_URL: resolvedApiUrl,
  ROOT_URL: resolvedRootUrl,
  DEFAULT_TIMEOUT_MS: 12000,
  MAX_GET_RETRIES: 2,
};

let isWarmingUp = false;
let isServerAwake = false;

// In-flight GET requests map for deduplication / promise coalescing
const inFlightRequests = new Map<string, Promise<{ ok: boolean; status: number; data: any }>>();

/**
 * Triggers a non-blocking background ping to wake up the server if needed
 */
export async function wakeBackendServer(): Promise<boolean> {
  if (isServerAwake || isWarmingUp) return isServerAwake;
  isWarmingUp = true;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${API_CONFIG.ROOT_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (res.ok) {
      isServerAwake = true;
    }
  } catch {
    // Non-critical background ping
  } finally {
    isWarmingUp = false;
  }

  return isServerAwake;
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
  skipDeduplication?: boolean;
}

/**
 * Centralized API fetch wrapper with timeout, token injection, deduplication, and safe retry
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {},
  retries?: number
): Promise<{ ok: boolean; status: number; data: T }> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_CONFIG.BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  // In-flight deduplication for identical concurrent GET requests
  const dedupeKey = `${method}:${url}`;
  if (isGet && !options.skipDeduplication) {
    const inFlight = inFlightRequests.get(dedupeKey);
    if (inFlight) {
      return inFlight as Promise<{ ok: boolean; status: number; data: T }>;
    }
  }

  const fetchPromise = (async () => {
    // Only retry safe GET requests on cold starts / 502/503/504
    // Never auto-retry state-changing mutations (POST, PUT, DELETE) to prevent duplicate orders/actions!
    const effectiveRetries = retries !== undefined
      ? retries
      : (isGet ? API_CONFIG.MAX_GET_RETRIES : 0);

    const timeoutDuration = options.timeoutMs || API_CONFIG.DEFAULT_TIMEOUT_MS;

    // Attach Bearer token automatically if not explicitly provided
    let authHeader: Record<string, string> = {};
    if (!options.skipAuth && (!options.headers || !('Authorization' in (options.headers as any)))) {
      const storedToken = await secureStorage.getAuthToken();
      if (storedToken) {
        authHeader = { Authorization: `Bearer ${storedToken}` };
      }
    }

    const stopTimer = perfMonitor.startTimer(`HTTP ${method} ${endpoint}`);

    for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      // Support external cancellation signal if provided
      if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...authHeader,
            ...(options.headers || {}),
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        isServerAwake = true;

        // Handle server cold start (Render 502/503/504 Bad Gateway during instance spin-up) for GET only
        if (isGet && [502, 503, 504].includes(res.status) && attempt < effectiveRetries) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }

        let parsedData: any = null;
        const text = await res.text();
        try {
          parsedData = text ? JSON.parse(text) : null;
        } catch {
          parsedData = { message: text };
        }

        stopTimer({ status: res.status, attempt });

        return {
          ok: res.ok,
          status: res.status,
          data: parsedData as T,
        };
      } catch (err: any) {
        clearTimeout(timeoutId);

        const isTimeout = err.name === 'AbortError';
        const isNetworkErr = err.message && (err.message.includes('Network') || err.message.includes('fetch'));

        if (isGet && (isTimeout || isNetworkErr) && attempt < effectiveRetries) {
          // Cold start retry backoff for read queries only
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }

        stopTimer({ error: err.message, isTimeout, attempt });

        throw new Error(
          isTimeout
            ? 'Request timed out. Please check your connection.'
            : err.message || 'Unable to communicate with Ardab Market server.'
        );
      }
    }

    throw new Error('Connection timeout. Please try again.');
  })();

  if (isGet && !options.skipDeduplication) {
    inFlightRequests.set(dedupeKey, fetchPromise);
    fetchPromise.finally(() => {
      inFlightRequests.delete(dedupeKey);
    });
  }

  return fetchPromise;
}
