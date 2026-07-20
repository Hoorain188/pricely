import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// ── Types ──
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'support' | 'readonly';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

// ── Zustand Auth Store ──
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user: User, token: string) => {
    try {
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to store auth data:', error);
    }
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
    } catch (error) {
      console.warn('Failed to clear auth data:', error);
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userJson = await SecureStore.getItemAsync('auth_user');

      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.warn('Failed to load stored auth:', error);
      set({ isLoading: false });
    }
  },
}));
