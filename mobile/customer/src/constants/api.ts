// ==============================================================================
// Ardab Market - Mobile API Configuration & Deployed Backend Client
// ==============================================================================
// Configured to connect directly to the deployed Render backend:
// https://ardab-market-platform-org.onrender.com
// Includes cold-start resilience, background wake ping, and retry backoff.

export const API_CONFIG = {
  // Deployed Render backend base URL
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://ardab-market-platform-org.onrender.com/api',
  ROOT_URL: 'https://ardab-market-platform-org.onrender.com',
  // Generous timeout to gracefully accommodate Render free/starter instance cold starts
  TIMEOUT_MS: 35000,
  // Retries for transient 502/503/504 gateway wake-up errors
  MAX_RETRIES: 2,
};

let isWarmingUp = false;
let isServerAwake = false;

/**
 * Triggers a non-blocking background ping to wake up the Render instance from sleep
 */
export async function wakeBackendServer(): Promise<boolean> {
  if (isServerAwake || isWarmingUp) return isServerAwake;
  isWarmingUp = true;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

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
    // Non-critical background ping; silent fallback
  } finally {
    isWarmingUp = false;
  }

  return isServerAwake;
}

/**
 * Robust fetch wrapper with timeout, cold-start retry backoff, and JSON parsing
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = API_CONFIG.MAX_RETRIES
): Promise<{ ok: boolean; status: number; data: T }> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      isServerAwake = true;

      // Handle server waking up (Render 502/503/504 Bad Gateway during instance spin-up)
      if ([502, 503, 504].includes(res.status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
        continue;
      }

      let parsedData: any = null;
      const text = await res.text();
      try {
        parsedData = text ? JSON.parse(text) : null;
      } catch {
        parsedData = { message: text };
      }

      return {
        ok: res.ok,
        status: res.status,
        data: parsedData as T,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isTimeout = err.name === 'AbortError';
      const isNetworkErr = err.message && (err.message.includes('Network') || err.message.includes('fetch'));

      if ((isTimeout || isNetworkErr) && attempt < retries) {
        // Render cold start retry backoff
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }

      throw new Error(
        isTimeout
          ? 'Server is starting up. Please check your connection and try again.'
          : err.message || 'Unable to communicate with Ardab Market server.'
      );
    }
  }

  throw new Error('Connection timeout. Please try again.');
}
