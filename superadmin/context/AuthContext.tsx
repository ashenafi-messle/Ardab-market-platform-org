'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SuperAdminUser, LoginCredentials } from '@/types/auth';
import { authApi, setAuthToken } from '@/lib/api';

interface AuthContextType {
  user: SuperAdminUser | null;
  isAuthenticated: boolean;
  isSubAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string; user?: SuperAdminUser }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');

  const fetchCurrentUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial auth check on app load
  useEffect(() => {
    let isSubscribed = true;
    authApi
      .getMe()
      .then((me) => {
        if (isSubscribed) {
          setUser(me);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Listen for global session expiration dispatched by API gateway
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setAuthToken(null);
      const isPublicPath = PUBLIC_PATHS.includes(pathname);
      if (!isPublicPath) {
        router.push('/login?expired=true');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:session_expired', handleSessionExpired);
      return () => {
        window.removeEventListener('auth:session_expired', handleSessionExpired);
      };
    }
  }, [pathname, router]);

  // Client-side route protection
  useEffect(() => {
    if (!isLoading) {
      const isPublicPath = PUBLIC_PATHS.includes(pathname);
      if (!user && !isPublicPath) {
        router.push('/login');
      } else if (user && (pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password')) {
        if (user.role === 'SUB_ADMIN') {
          router.push('/subadmin/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(credentials);
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true, message: res.message, user: res.user };
      }
      return { success: false, message: res.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push('/login');
    }
  };

  const isSubAdmin = user?.role === 'SUB_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isSubAdmin,
        isSuperAdmin,
        isLoading,
        selectedCity,
        setSelectedCity,
        login,
        logout,
        refreshAuth: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
