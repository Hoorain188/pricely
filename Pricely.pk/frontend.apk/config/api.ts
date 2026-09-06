import Constants from 'expo-constants';

/**
 * Where the backend lives.
 *
 * Production Railway Backend: https://pricely-production-15a0.up.railway.app
 * Uses HTTPS with no port specification.
 *
 * In local development, if USE_PRODUCTION is set to false, it reuses the address
 * Expo is serving from so there's no hardcoded local IP to update.
 */
const PRODUCTION_URL = 'https://pricely-production-15a0.up.railway.app';
const DEV_PORT = 5059;

// Set USE_PRODUCTION to false for local dev server
const USE_PRODUCTION = false;

function resolveBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/$/, '');

  if (USE_PRODUCTION || !__DEV__) {
    return PRODUCTION_URL;
  }

  // e.g. "192.168.100.25:8081" — the machine running `expo start`.
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];

  if (host) return `http://${host}:${DEV_PORT}`;

  return `http://localhost:${DEV_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();
