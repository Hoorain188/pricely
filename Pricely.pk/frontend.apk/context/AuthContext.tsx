import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as authService from '../services/authService';

// ── Types ──
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'support' | 'readonly';
  avatar?: string;
  phone?: string;
  location?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, token: string, refreshToken?: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

// ── Zustand Auth Store ──
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  // refreshToken is optional so profile edits can update the stored user
  // without having to re-supply it; omitting it keeps the current one.
  setAuth: async (user: User, token: string, refreshToken?: string) => {
    const nextRefresh = refreshToken ?? get().refreshToken;
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      if (nextRefresh) await SecureStore.setItemAsync(REFRESH_KEY, nextRefresh);
    } catch (error) {
      console.warn('Failed to store auth data:', error);
    }
    set({ user, token, refreshToken: nextRefresh, isAuthenticated: true });
  },

  clearAuth: async () => {
    const { refreshToken } = get();

    // Tell the server to revoke this device's session. Best-effort: if the
    // API is unreachable we still sign out locally rather than trapping
    // someone in a session they asked to leave.
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch (error) {
        console.warn('Server logout failed; clearing locally anyway:', error);
      }
    }

    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.warn('Failed to clear auth data:', error);
    }
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedRefresh = await SecureStore.getItemAsync(REFRESH_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);

      if (!token || !userJson) {
        set({ isLoading: false });
        return;
      }

      const user = JSON.parse(userJson) as User;

      // The stored access token may have expired while the app was closed.
      // Trading the refresh token for a new one keeps people signed in
      // instead of bouncing them to the login screen every time.
      if (storedRefresh) {
        try {
          const renewed = await authService.refresh(storedRefresh);
          await SecureStore.setItemAsync(TOKEN_KEY, renewed.accessToken);
          await SecureStore.setItemAsync(REFRESH_KEY, renewed.refreshToken);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(renewed.user));
          set({
            user: renewed.user,
            token: renewed.accessToken,
            refreshToken: renewed.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        } catch (error) {
          // A rejected refresh token means the session is genuinely over
          // (expired, or revoked from another device) — sign out. A network
          // failure lands here too, which is why the stored session is kept
          // below rather than wiped.
          if (error instanceof authService.ApiError && error.code !== 'network_error') {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
            set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
            return;
          }
          console.warn('Could not reach the server to refresh; using stored session.');
        }
      }

      set({ user, token, refreshToken: storedRefresh, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.warn('Failed to load stored auth:', error);
      set({ isLoading: false });
    }
  },
}));
