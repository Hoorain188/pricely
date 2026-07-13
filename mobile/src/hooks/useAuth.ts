import { useAuthStore } from '../context/AuthContext';
import * as authService from '../services/authService';

/**
 * Custom hook for authentication actions.
 * Wraps Zustand store + API service calls.
 */
export const useAuth = () => {
  const { user, token, isAuthenticated, isLoading, setAuth, clearAuth, loadStoredAuth } =
    useAuthStore();

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    await setAuth(response.user, response.token);
    return response;
  };

  /**
   * Signup with name, email, and password
   */
  const signup = async (name: string, email: string, password: string) => {
    const response = await authService.signup({ name, email, password });
    await setAuth(response.user, response.token);
    return response;
  };

  /**
   * Logout and clear stored credentials
   */
  const logout = async () => {
    await authService.logout();
    await clearAuth();
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    loadStoredAuth,
  };
};
