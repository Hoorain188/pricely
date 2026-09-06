'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthUser, setApiAuthToken } from '../../services/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string, refreshToken: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  isLoading: true,
  setAuth: () => {},
  clearAuth: () => {},
});

const STORAGE_KEY = 'pricely_auth';

// Read localStorage once at module level (client-side only)
// This avoids calling setState synchronously inside a useEffect.
function readPersistedAuth(): { user: AuthUser | null; token: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const { user, token } = JSON.parse(raw) as { user: AuthUser; token: string };
      return { user, token };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { user: null, token: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializers read localStorage during the very first render — no effect needed.
  const [user, setUser] = useState<AuthUser | null>(() => readPersistedAuth().user);
  const [token, setToken] = useState<string | null>(() => {
    const t = readPersistedAuth().token;
    if (t) setApiAuthToken(t); // safe: called only once during initialization
    return t;
  });
  const [isLoading, setIsLoading] = useState(false); // already resolved via lazy init

  const setAuth = useCallback((user: AuthUser, accessToken: string, refreshToken: string) => {
    setUser(user);
    setToken(accessToken);
    setApiAuthToken(accessToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token: accessToken, refreshToken }));
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    setApiAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
