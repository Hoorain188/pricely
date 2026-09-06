import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as authService from '../services/authService';
import { setApiAuthToken } from '../app/api/client';
import { registerPushToken, unregisterPushToken } from '../services/pushNotifications';

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
    // Admin screens use a separate client; keep its token in step or every
    // admin call goes out unauthenticated and comes back 401.
    setApiAuthToken(token);
    set({ user, token, refreshToken: nextRefresh, isAuthenticated: true });

    // Register this device for notifications. Deliberately not awaited: it
    // asks the OS for permission, which puts a dialog in front of someone who
    // has just signed in, and nothing about signing in should wait on their
    // answer. It handles its own failures and never throws.
    void registerPushToken(token);
  },

  clearAuth: async () => {
    const { refreshToken, token } = get();

    // Before the token is thrown away, since unregistering needs it. Without
    // this the next person to sign in on this phone keeps receiving the
    // previous one's price alerts.
    if (token) await unregisterPushToken(token);

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
    setApiAuthToken(null);
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
          setApiAuthToken(renewed.accessToken);
          set({
            user: renewed.user,
            token: renewed.accessToken,
            refreshToken: renewed.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Re-register on every launch. The OS reissues push tokens — after
          // a reinstall, a restore to a new phone, sometimes an app update —
          // and the server would otherwise keep sending to an address that
          // stopped existing. Registering an unchanged token is a no-op.
          void registerPushToken(renewed.accessToken);
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

      setApiAuthToken(token);
      set({ user, token, refreshToken: storedRefresh, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.warn('Failed to load stored auth:', error);
      set({ isLoading: false });
    }
  },
}));
