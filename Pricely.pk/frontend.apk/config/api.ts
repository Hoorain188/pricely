import Constants from 'expo-constants';

/**
 * Where the backend lives.
 *
 * "localhost" is useless from a phone — on a device it means the phone
 * itself, not the laptop running the API. So in development we reuse the
 * address Expo is already serving this bundle from, which is exactly the
 * laptop's address on the same WiFi. That means no hardcoded IP to update
 * every time the network hands out a different one.
 *
 * Set EXPO_PUBLIC_API_URL to override — that's what to point at the
 * deployed URL once the API is hosted somewhere.
 */
const DEV_PORT = 5059;

function resolveBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/$/, '');

  // e.g. "192.168.100.25:8081" — the machine running `expo start`.
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];

  if (host) return `http://${host}:${DEV_PORT}`;

  // Only reached in a production build with no override set, where a
  // real URL should have been configured.
  return `http://localhost:${DEV_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();
