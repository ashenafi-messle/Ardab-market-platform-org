'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CustomerUser } from '@/types/marketplace';
import { customerApi } from '@/lib/api';

interface CustomerAuthContextType {
  customer: CustomerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  login: (credentials: { identifier: string; password: string } | string, maybePassword?: string) => Promise<any>;
  loginWithGoogle: (data: { email: string; name?: string; picture?: string }) => Promise<any>;
  register: (data: { email: string; phone: string; city: string; fullName?: string }) => Promise<any>;
  resendVerification: (email: string) => Promise<any>;
  verifyEmail: (token: string, email?: string) => Promise<any>;
  setPassword: (token: string, password: string, email?: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (data: { token: string; email?: string; password?: string; newPassword?: string }) => Promise<any>;
  logout: () => void;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCity, setSelectedCityState] = useState<string>('Gondar');
  const [error, setError] = useState<string | null>(null);

  const setSelectedCity = useCallback((city: string) => {
    setSelectedCityState(city);
    localStorage.setItem('ardab_customer_city', city);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshProfile = useCallback(async () => {
    try {
      const token = customerApi.getToken();
      if (!token) {
        setCustomer(null);
        return;
      }
      const me = await customerApi.getMe();
      setCustomer(me);
      if (me.city) {
        setSelectedCityState(me.city);
      }
    } catch {
      setCustomer(null);
      customerApi.setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedCity = localStorage.getItem('ardab_customer_city');
    if (savedCity) {
      setSelectedCityState(savedCity);
    }
    refreshProfile();
  }, [refreshProfile]);

  const register = useCallback(async (data: { email: string; phone: string; city: string; fullName?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await customerApi.register(data);
      return { success: true, data: res, message: res?.message || 'Verification link sent to your email.' };
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await customerApi.resendVerification(email);
      return { success: true, data: res, message: res?.message || 'Verification link resent.' };
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (token: string, email?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await customerApi.verifyEmail({ token, email });
      return { success: true, data: res, ...res };
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setPassword = useCallback(async (token: string, pass: string, email?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await customerApi.setPassword({ token, password: pass, email });
      if (res && res.token) {
        customerApi.setToken(res.token);
        await refreshProfile();
      }
      return { success: true, data: res };
    } catch (err: any) {
      setError(err.message || 'Failed to set password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshProfile]);

  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await customerApi.forgotPassword(email);
      return { success: true, data: res };
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (data: { token: string; email?: string; password?: string; newPassword?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await customerApi.resetPassword(data);
      return { success: true, data: res };
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: { identifier: string; password: string } | string, maybePassword?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = typeof credentials === 'string'
        ? { identifier: credentials, password: maybePassword || '' }
        : credentials;
      const res = await customerApi.login(payload);
      if (res && res.token) {
        customerApi.setToken(res.token);
      }
      if (res && res.customer) {
        setCustomer(res.customer);
        if (res.customer.city) {
          setSelectedCityState(res.customer.city);
        }
      } else {
        await refreshProfile();
      }
      return { success: true, data: res };
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshProfile]);

  const loginWithGoogle = useCallback(async (data: { email: string; name?: string; picture?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await customerApi.googleLogin(data);
      if (res && res.token) {
        customerApi.setToken(res.token);
      }
      if (res && res.customer) {
        setCustomer(res.customer);
        if (res.customer.city) {
          setSelectedCityState(res.customer.city);
        }
      } else {
        await refreshProfile();
      }
      return { success: true, data: res };
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshProfile]);

  const logout = useCallback(() => {
    customerApi.setToken(null);
    setCustomer(null);
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isAuthenticated: !!customer,
        isLoading,
        loading: isLoading,
        error,
        selectedCity,
        setSelectedCity,
        login,
        loginWithGoogle,
        register,
        resendVerification,
        verifyEmail,
        setPassword,
        forgotPassword,
        resetPassword,
        logout,
        clearError,
        refreshProfile,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
