import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAuthToken } from '@/services/api';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  timezone: string;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    timezone?: string;
    currency?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  quickDemoLogin: () => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const TOKEN_STORAGE_KEY = 'syncspace_auth_token';
const USER_STORAGE_KEY = 'syncspace_auth_user';

// Simple cross-platform storage adapter (supports Web localStorage & in-memory fallback)
const memoryStorage: Record<string, string> = {};

const storage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryStorage[key] || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {}
    memoryStorage[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {}
    delete memoryStorage[key];
  },
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuth = useCallback((newToken: string | null, newUser: User | null) => {
    setTokenState(newToken);
    setUser(newUser);
    setAuthToken(newToken);

    if (newToken && newUser) {
      storage.setItem(TOKEN_STORAGE_KEY, newToken);
      storage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    } else {
      storage.removeItem(TOKEN_STORAGE_KEY);
      storage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = storage.getItem(TOKEN_STORAGE_KEY);
        const savedUserStr = storage.getItem(USER_STORAGE_KEY);

        if (savedToken && savedUserStr) {
          const parsedUser = JSON.parse(savedUserStr);
          setAuthToken(savedToken);
          setTokenState(savedToken);
          setUser(parsedUser);

          // Verify token validity in background
          try {
            const verifyRes = await api.getMe();
            if (verifyRes && verifyRes.status === 200 && verifyRes.data?.user) {
              setUser(verifyRes.data.user);
              storage.setItem(USER_STORAGE_KEY, JSON.stringify(verifyRes.data.user));
            } else if (verifyRes && verifyRes.status === 401) {
              // Token expired or invalid
              applyAuth(null, null);
            }
          } catch {
            // Keep offline user if network fails
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [applyAuth]);

  // Login handler
  const login = async (email: string, password: string) => {
    try {
      const res = await api.login({ email, password });
      if (res && (res.status === 200 || res.status === 201) && res.data?.token) {
        applyAuth(res.data.token, res.data.user);
        return { success: true };
      }
      // Surface specific validation detail if available
      const detailMsg = (res as any)?.details?.[0]?.message;
      return {
        success: false,
        message: detailMsg || res?.message || res?.error || 'Invalid credentials. Please try again.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Login failed. Please check your connection.',
      };
    }
  };

  // Register handler
  const register = async (payload: {
    email: string;
    password: string;
    full_name: string;
    timezone?: string;
    currency?: string;
  }) => {
    try {
      const res = await api.register(payload);
      if (res && (res.status === 200 || res.status === 201) && res.data?.token) {
        applyAuth(res.data.token, res.data.user);
        return { success: true };
      }
      // Surface specific validation detail if available (e.g. "Password must contain at least one number")
      const detailMsg = (res as any)?.details?.[0]?.message;
      return {
        success: false,
        message: detailMsg || res?.message || res?.error || 'Registration failed. Please check your inputs.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Registration failed. Please try again.',
      };
    }
  };

  // 1-Click Quick Demo Login for instant development preview
  const quickDemoLogin = async () => {
    const demoEmail = 'alex.mercer@syncspace.io';
    const demoPassword = 'DemoPassword123!';
    const demoFullName = 'Alex Mercer';

    // 1. Try logging in with standard demo credentials
    const loginResult = await login(demoEmail, demoPassword);
    if (loginResult.success) {
      return loginResult;
    }

    // 2. If account doesn't exist, create it automatically
    const registerResult = await register({
      email: demoEmail,
      password: demoPassword,
      full_name: demoFullName,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      currency: 'USD',
    });

    return registerResult;
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    applyAuth(null, null);
  };

  // Refresh profile handler
  const refreshProfile = async () => {
    try {
      const res = await api.getMe();
      if (res && res.status === 200 && res.data?.user) {
        setUser(res.data.user);
        storage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data.user));
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        quickDemoLogin,
        logout,
        refreshProfile,
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
