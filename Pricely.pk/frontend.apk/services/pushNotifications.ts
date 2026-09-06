import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { API_BASE_URL } from '../config/api';

/**
 * Getting this phone registered for notifications.
 *
 * Three things have to line up, and all three are silent when they fail:
 * the person has to allow notifications, the OS has to issue a token, and
 * the server has to be told what it is. Nothing can be delivered until then,
 * so each step reports rather than failing quietly.
 */

// Show a banner even while the app is open. Without this a notification that
// arrives mid-use is delivered to the OS and never seen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushRegistration = { token: string; platform: string };

/**
 * Asks permission if it has not been asked, then returns this device's push
 * token. Returns null when notifications are not possible — declined, or a
 * simulator, which cannot receive them at all.
 */
export async function getPushToken(): Promise<PushRegistration | null> {
  if (!Device.isDevice) {
    console.warn('[push] Simulators cannot receive notifications');
    return null;
  }

  if (Platform.OS === 'android') {
    // Android 8+ drops notifications that arrive with no channel. This must
    // exist before the first one, not after.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Price alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  // Only ask when it has not been decided. Asking again after a refusal does
  // nothing on either platform except return "denied" a second time.
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }

  if (status !== 'granted') {
    console.warn('[push] Notifications were not allowed');
    return null;
  }

  // Expo needs the project id to issue a token for a standalone build; in
  // Expo Go it is inferred, which is why this can be undefined there.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return { token: data, platform: Platform.OS };
  } catch (error) {
    console.warn('[push] Could not get a push token:', error);
    return null;
  }
}

/**
 * Tells the server where to reach this device. Needs the access token,
 * because a device is registered against whoever is signed in.
 */
export async function registerPushToken(authToken: string): Promise<void> {
  const registration = await getPushToken();
  if (!registration) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/me/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(registration),
    });

    if (!response.ok) {
      console.warn('[push] Server rejected the token:', response.status);
    }
  } catch (error) {
    // Never rethrown: failing to register must not block signing in.
    console.warn('[push] Could not send the token to the server:', error);
  }
}

/**
 * Stops notifications to this device, called on logout — otherwise the next
 * person to sign in on this phone keeps receiving the last one's alerts.
 */
export async function unregisterPushToken(authToken: string): Promise<void> {
  try {
    const registration = await getPushToken();
    if (!registration) return;

    await fetch(
      `${API_BASE_URL}/api/v1/me/push-token?token=${encodeURIComponent(registration.token)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } },
    );
  } catch (error) {
    console.warn('[push] Could not unregister the token:', error);
  }
}
