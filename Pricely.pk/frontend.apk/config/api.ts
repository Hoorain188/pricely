import Constants from 'expo-constants';

/**
 * Where the backend lives.
 *
 * Production: the Render service. Release builds always use it.
 *
 * In local development, if USE_PRODUCTION is set to false, it reuses the address
 * Expo is serving from so there's no hardcoded local IP to update.
 *
 * EXPO_PUBLIC_API_URL overrides both — that is what eas.json sets per profile.
 */
const PRODUCTION_URL = 'https://pricely-api-xghc.onrender.com';

// Must match applicationUrl in backend/Pricely.Api/Properties/launchSettings.json.
// It has read 5059 twice while the API served 5099, so nothing connected in
// Expo Go — and the failure looks like a dead network rather than a wrong port.
const DEV_PORT = 5099;

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
