import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '@/types';
import { secureStorage } from '@/services/secureStorage';
import { authApi } from '@/services/authApi';

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  savedIdentity: string | null;

  // Session
  restoreSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearSavedIdentity: () => Promise<void>;

  // Login
  login: (identifier: string, password: string) => Promise<UserProfile>;

  // Registration flows
  requestEmailOtp: (email: string, city: string) => Promise<any>;
  verifyEmailOtp: (email: string, otp: string) => Promise<any>;
  requestTelegramOtp: (phone: string, city: string) => Promise<any>;
  verifyTelegramOtp: (phone: string, otp: string) => Promise<any>;
  createPasswordAndAccount: (payload: {
    email?: string;
    phone?: string;
    city: string;
    password: string;
    verificationToken?: string;
  }) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Masks an email or phone for secure display in returning user banner:
 * ashenafi@gmail.com -> ash*****@gmail.com
 * +251911234567 -> +251 9*****567
 */
export function maskIdentity(identity: string): string {
  if (!identity) return '';
  if (identity.includes('@')) {
    const [local, domain] = identity.split('@');
    if (local.length <= 3) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 3)}*****@${domain}`;
  }
  // Phone
  const cleaned = identity.replace(/\s+/g, '');
  if (cleaned.length > 7) {
    return `${cleaned.slice(0, 5)}*****${cleaned.slice(-3)}`;
  }
  return identity;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedIdentity, setSavedIdentity] = useState<string | null>(null);

  /**
   * Bootstraps authenticated session on app launch
   * Checks secure storage, restores user instantly from cache, and revalidates in background.
   */
  const restoreSession = useCallback(async (): Promise<boolean> => {
    try {
      // 1. Parallelize local storage reads for instant (<5ms) access
      const [storedIdentity, storedToken, cachedUser] = await Promise.all([
        secureStorage.getSavedIdentity(),
        secureStorage.getAuthToken(),
        secureStorage.getUserData<UserProfile>(),
      ]);

      if (storedIdentity) {
        setSavedIdentity(storedIdentity);
      }

      if (!storedToken) {
        setIsLoading(false);
        return false;
      }

      // 2. If cached user data is available, restore UI INSTANTLY without waiting for network!
      if (cachedUser) {
        setUser(cachedUser);
        setToken(storedToken);
        setIsLoading(false); // Unblock app shell immediately!
      }

      // 3. Revalidate session in the background (stale-while-revalidate)
      const validateSessionInBackground = async () => {
        try {
          let liveUser = await authApi.getMe(storedToken);
          let activeToken = storedToken;

          if (!liveUser) {
            // Attempt session refresh if /me failed
            const storedRefreshToken = await secureStorage.getRefreshToken();
            const refreshed = await authApi.refresh(storedRefreshToken || storedToken);
            if (refreshed) {
              activeToken = refreshed.token;
              liveUser = refreshed.user;
              await Promise.all([
                secureStorage.saveAuthToken(activeToken),
                secureStorage.saveUserData(liveUser),
              ]);
            }
          }

          if (liveUser) {
            setUser(liveUser);
            setToken(activeToken);
            await secureStorage.saveUserData(liveUser);
          } else if (!cachedUser) {
            // Token expired and no valid cache
            await secureStorage.clearAuthToken();
            setUser(null);
            setToken(null);
          }
        } catch (bgErr) {
          console.warn('[AuthContext] Background session revalidation notice:', bgErr);
        } finally {
          setIsLoading(false);
        }
      };

      if (cachedUser) {
        // Non-blocking background revalidation
        validateSessionInBackground();
        return true;
      } else {
        // No cache yet (first login / fresh state): wait for validation
        await validateSessionInBackground();
        return Boolean(storedToken);
      }
    } catch (err) {
      console.warn('[AuthContext] Session restore error:', err);
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  /**
   * Unified Login (Email OR Phone + Password)
   */
  const login = async (identifier: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const result = await authApi.login(identifier, password);
      setToken(result.token);
      setUser(result.user);

      // Save token in secure storage (NEVER plain passwords!)
      await secureStorage.saveAuthToken(result.token);
      await secureStorage.saveUserData(result.user);

      // Save identity for convenient returning user experience
      await secureStorage.saveSavedIdentity(identifier.trim());
      setSavedIdentity(identifier.trim());

      return result.user;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Email OTP Request (Registration Option 1)
   */
  const requestEmailOtp = async (email: string, city: string) => {
    return await authApi.requestEmailOtp(email, city);
  };

  /**
   * Email OTP Verify
   */
  const verifyEmailOtp = async (email: string, otp: string) => {
    return await authApi.verifyEmailOtp(email, otp);
  };

  /**
   * Telegram Bot OTP Request (Registration Option 2)
   */
  const requestTelegramOtp = async (phone: string, city: string) => {
    return await authApi.requestTelegramOtp(phone, city);
  };

  /**
   * Telegram OTP Verify
   */
  const verifyTelegramOtp = async (phone: string, otp: string) => {
    return await authApi.verifyTelegramOtp(phone, otp);
  };

  /**
   * Finalize Registration: Create password -> Atomically create account -> Auto-sign in
   */
  const createPasswordAndAccount = async (payload: {
    email?: string;
    phone?: string;
    city: string;
    password: string;
    verificationToken?: string;
  }): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const result = await authApi.completeRegistration(payload);
      setToken(result.token);
      setUser(result.user);

      await secureStorage.saveAuthToken(result.token);
      await secureStorage.saveUserData(result.user);

      const primaryId = payload.email || payload.phone || result.user.email || result.user.phone;
      if (primaryId) {
        await secureStorage.saveSavedIdentity(primaryId);
        setSavedIdentity(primaryId);
      }

      return result.user;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Explicit Sign Out
   * Safely terminates backend session, revokes refresh token, and unconditionally
   * purges device authentication credentials and active in-memory state.
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      const activeToken = token;
      if (activeToken) {
        try {
          await authApi.logout(activeToken);
        } catch (apiErr) {
          console.warn('[AuthContext] Backend logout API failed, continuing local session purge:', apiErr);
        }
      }
    } catch {
      // Ignore network or unexpected errors to ensure local session is always destroyed
    } finally {
      await secureStorage.clearAllSession();
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  /**
   * Forget saved identity on device
   */
  const clearSavedIdentity = async () => {
    await secureStorage.clearSavedIdentity();
    setSavedIdentity(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        savedIdentity,
        restoreSession,
        logout,
        clearSavedIdentity,
        login,
        requestEmailOtp,
        verifyEmailOtp,
        requestTelegramOtp,
        verifyTelegramOtp,
        createPasswordAndAccount,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
