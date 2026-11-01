/**
 * Ardab Market Agent - Centralized API Client & Networking Configuration
 *
 * Configures connection to central Render backend with:
 * - Base URL resolution (EXPO_PUBLIC_API_URL / NEXT_PUBLIC_API_URL / default Render production URL)
 * - Automatic Authorization header injection via SecureStore
 * - Automatic token refresh on 401 using stored refresh token
 * - Timeout handling and standard error mapping
 */

import { secureStorage } from '../services/secureStorage';

const resolvedApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://ardab-market-platform-org.onrender.com/api';

const resolvedRootUrl = resolvedApiUrl.replace(/\/api\/?$/, '');

export const API_CONFIG = {
  BASE_URL: resolvedApiUrl,
  ROOT_URL: resolvedRootUrl,
  AGENT_BASE_URL: `${resolvedApiUrl}/agent`,
  TIMEOUT_MS: 15000,
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
}

export async function agentFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = API_CONFIG.TIMEOUT_MS, skipAuth = false, ...fetchOptions } = options;

  const url = path.startsWith('http')
    ? path
    : `${API_CONFIG.AGENT_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (!skipAuth) {
    const token = await secureStorage.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // Handle 401 Token Expiration -> Attempt Refresh
    if (response.status === 401 && !skipAuth && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
      const refreshToken = await secureStorage.getRefreshToken();
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${API_CONFIG.AGENT_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            const refreshJson = await refreshRes.json();
            if (refreshRes.ok && refreshJson?.data?.tokens?.accessToken) {
              const newAccessToken = refreshJson.data.tokens.accessToken;
              const newRefreshToken = refreshJson.data.tokens.refreshToken || refreshToken;
              await secureStorage.saveAuthToken(newAccessToken);
              await secureStorage.saveRefreshToken(newRefreshToken);
              isRefreshing = false;
              onRefreshed(newAccessToken);
            } else {
              isRefreshing = false;
              await secureStorage.clearAuthToken();
              throw new Error('Session expired. Please log in again.');
            }
          } catch (e) {
            isRefreshing = false;
            await secureStorage.clearAuthToken();
            throw e;
          }
        }

        // Wait for token refresh and retry original request
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            try {
              headers['Authorization'] = `Bearer ${newToken}`;
              const retryRes = await fetch(url, {
                ...fetchOptions,
                headers,
              });
              const retryJson = await retryRes.json();
              if (!retryRes.ok) {
                throw new Error(retryJson?.message || 'Request failed after token refresh');
              }
              resolve(retryJson?.data !== undefined ? retryJson.data : retryJson);
            } catch (retryErr) {
              reject(retryErr);
            }
          });
        });
      }
    }

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        json?.message ||
        json?.error?.message ||
        `Request failed with status ${response.status}`;
      const err: any = new Error(errorMessage);
      err.status = response.status;
      err.code = json?.code || json?.error?.code;
      throw err;
    }

    return json?.data !== undefined ? json.data : json;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Network timeout. Please check your internet connection.');
    }
    throw error;
  }
}

