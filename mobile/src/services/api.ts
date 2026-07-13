import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Base API Configuration ──
// Update BASE_URL when backend is ready
const BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Attach Auth Token ──
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // SecureStore may not be available on web
      console.warn('SecureStore not available:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Response Interceptor: Handle Errors ──
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear stored token
      try {
        await SecureStore.deleteItemAsync('auth_token');
      } catch (e) {
        console.warn('Failed to clear token:', e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
