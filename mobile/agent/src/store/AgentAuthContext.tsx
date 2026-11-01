/**
 * Ardab Market Agent - Authentication & Session Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AgentProfile } from '../types/agent';
import { agentApi } from '../services/agentApi';
import { secureStorage } from '../services/secureStorage';

interface AgentAuthContextType {
  agent: AgentProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  rememberMeEnabled: boolean;
  rememberedEmail: string | null;
  rememberedPassword: string | null;
  unreadCount: number;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  activateAccount: (activationToken: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setRememberMe: (enabled: boolean, email?: string, password?: string) => Promise<void>;
  clearSavedCredentials: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

const AgentAuthContext = createContext<AgentAuthContextType | undefined>(undefined);

export function AgentAuthProvider({ children }: { children: React.ReactNode }) {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rememberMeEnabled, setRememberMeEnabled] = useState<boolean>(false);
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [rememberedPassword, setRememberedPassword] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(2);

  // Initialize session and restored credentials
  const initSession = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Check saved credentials for login screen
      const saved = await secureStorage.getRememberedCredentials();
      setRememberMeEnabled(saved.isEnabled);
      setRememberedEmail(saved.email);
      setRememberedPassword(saved.password);

      // 2. Check active session token
      const token = await secureStorage.getAuthToken();
      if (token) {
        // Authenticate with server profile
        const profile = await agentApi.getProfile();
        setAgent(profile);
        setIsAuthenticated(true);
        try {
          const unread = await agentApi.getUnreadCount();
          setUnreadCount(unread);
        } catch {
          // ignore unread count failure on boot
        }
      }
    } catch (err) {
      console.warn('[AgentAuth] Session initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const login = async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const { profile, token, refreshToken } = await agentApi.login(email, password);
      await secureStorage.saveAuthToken(token);
      if (refreshToken) {
        await secureStorage.saveRefreshToken(refreshToken);
      }

      if (rememberMe) {
        await secureStorage.saveRememberedCredentials(email, password);
        setRememberMeEnabled(true);
        setRememberedEmail(email);
        setRememberedPassword(password);
      } else {
        await secureStorage.clearRememberedCredentials();
        setRememberMeEnabled(false);
        setRememberedEmail(null);
        setRememberedPassword(null);
      }

      setAgent(profile);
      setIsAuthenticated(true);

      try {
        const unread = await agentApi.getUnreadCount();
        setUnreadCount(unread);
      } catch {
        // non-blocking
      }
    } finally {
      setIsLoading(false);
    }
  };

  const activateAccount = async (activationToken: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const { profile, token, refreshToken } = await agentApi.setInitialPassword(activationToken, password);
      await secureStorage.saveAuthToken(token);
      if (refreshToken) {
        await secureStorage.saveRefreshToken(refreshToken);
      }

      if (rememberMe) {
        await secureStorage.saveRememberedCredentials(profile.email, password);
        setRememberMeEnabled(true);
        setRememberedEmail(profile.email);
        setRememberedPassword(password);
      }

      setAgent(profile);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const refreshToken = await secureStorage.getRefreshToken();
      await agentApi.logout(refreshToken || undefined);
    } catch (err) {
      console.warn('[AgentAuth] Remote logout warning:', err);
    } finally {
      await secureStorage.clearAuthToken();
      setAgent(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const setRememberMe = async (enabled: boolean, email?: string, password?: string) => {
    if (enabled && email) {
      await secureStorage.saveRememberedCredentials(email, password);
      setRememberMeEnabled(true);
      setRememberedEmail(email);
      setRememberedPassword(password || null);
    } else {
      await secureStorage.clearRememberedCredentials();
      setRememberMeEnabled(false);
      setRememberedEmail(null);
      setRememberedPassword(null);
    }
  };

  const clearSavedCredentials = async () => {
    await secureStorage.clearRememberedCredentials();
    setRememberMeEnabled(false);
    setRememberedEmail(null);
    setRememberedPassword(null);
  };

  const refreshProfile = async () => {
    try {
      const profile = await agentApi.getProfile();
      setAgent(profile);
    } catch (err) {
      console.warn('[AgentAuth] Failed to refresh profile:', err);
    }
  };

  return (
    <AgentAuthContext.Provider
      value={{
        agent,
        isAuthenticated,
        isLoading,
        rememberMeEnabled,
        rememberedEmail,
        rememberedPassword,
        unreadCount,
        login,
        activateAccount,
        logout,
        setRememberMe,
        clearSavedCredentials,
        refreshProfile,
        setUnreadCount,
      }}
    >
      {children}
    </AgentAuthContext.Provider>
  );
}

export function useAgentAuth() {
  const context = useContext(AgentAuthContext);
  if (!context) {
    throw new Error('useAgentAuth must be used within an AgentAuthProvider');
  }
  return context;
}

