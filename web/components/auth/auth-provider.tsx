'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthMe, login as loginApi, register as registerApi } from '@/lib/api';
import { clearStoredAccessToken, getStoredAccessToken, setStoredAccessToken } from '@/lib/auth-storage';
import { User } from '@/lib/types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getStoredAccessToken();
    if (!token) {
      setUser(null);
      return;
    }

    const me = await getAuthMe();
    setUser({
      id: me.id,
      name: me.name,
      email: me.email,
      role: me.role,
      phone: '-',
      createdAt: me.createdAt,
      totalBookings: me.bookingCount,
      totalTickets: me.ticketCount
    });
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        setLoading(true);
        if (!getStoredAccessToken()) {
          if (active) {
            setUser(null);
          }
          return;
        }

        const me = await getAuthMe();
        if (!active) {
          return;
        }

        setUser({
          id: me.id,
          name: me.name,
          email: me.email,
          role: me.role,
          phone: '-',
          createdAt: me.createdAt,
          totalBookings: me.bookingCount,
          totalTickets: me.ticketCount
        });
      } catch {
        clearStoredAccessToken();
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const payload = await loginApi(input);
    setStoredAccessToken(payload.accessToken);
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(async (input: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }) => {
    const payload = await registerApi(input);
    setStoredAccessToken(payload.accessToken);
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    clearStoredAccessToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login,
    register,
    logout,
    refreshUser
  }), [user, loading, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
