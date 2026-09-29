// ==============================================================================
// Ardab Market - Mobile Push Notification Service (Expo Notifications)
// ==============================================================================

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { apiFetch } from '@/constants/api';
import { secureStorage } from '@/services/secureStorage';

const STORAGE_KEYS = {
  PUSH_TOKEN: 'ardab_push_token',
  PERMISSION_ASKED: 'ardab_notif_perm_asked',
};

// 1. Configure foreground notification presentation behavior (native only)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () =>
      ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      } as any),
  });
}

/**
 * Configure Android Notification Channels according to importance levels
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('new-products', {
      name: 'New Products & Arrivals',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#208AEF',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promotions & Discounts',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('general', {
      name: 'General Announcements',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      showBadge: true,
    });
  } catch (error) {
    console.warn('[PUSH] Failed to setup Android notification channels:', error);
  }
}

/**
 * Request notification permission and register push token with backend
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications are native mobile only (Android / iOS)
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // Android notification channels must be established first
    await setupNotificationChannels();

    // Push notifications only operate on physical devices
    if (!Device.isDevice) {
      console.log('[PUSH] Push notifications are only supported on physical devices');
      return null;
    }

    // Check existing permission
    const existingPerm = await Notifications.getPermissionsAsync();
    let finalStatus = existingPerm.status;

    if (existingPerm.status !== 'granted') {
      const requestRes = await Notifications.requestPermissionsAsync();
      finalStatus = requestRes.status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PUSH] Push notification permission not granted by user');
      return null;
    }

    // Resolve Expo EAS Project ID safely
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      '141e305e-8da7-4bb0-b221-31f7a00d3bd0';

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const pushToken = tokenResponse.data;
    if (!pushToken) return null;

    // Cache locally
    await secureStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, pushToken);

    // Register with backend under current authenticated customer
    await apiFetch('/customer/notifications/devices', {
      method: 'POST',
      body: JSON.stringify({
        pushToken,
        platform: Platform.OS.toUpperCase(),
        deviceId: Device.modelName || Device.deviceName || null,
        appVersion: Constants.expoConfig?.version || '1.0.0',
      }),
    });

    console.log('[PUSH] Successfully registered push token with backend');
    return pushToken;
  } catch (err: any) {
    console.warn('[PUSH] Error registering push notifications:', err.message);
    return null;
  }
}

/**
 * Unregister device token upon user logout
 */
export async function unregisterPushDevice(): Promise<void> {
  try {
    const pushToken = await secureStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    if (pushToken) {
      await apiFetch('/customer/notifications/devices', {
        method: 'DELETE',
        body: JSON.stringify({ pushToken }),
      });
      await secureStorage.deleteItem(STORAGE_KEYS.PUSH_TOKEN);
      console.log('[PUSH] Unregistered device push token on logout');
    }
  } catch (err: any) {
    console.warn('[PUSH] Failed to unregister device push token:', err.message);
  }
}

/**
 * Handle notification tap response and navigate to target screen
 */
export function handleNotificationResponse(response: Notifications.NotificationResponse): void {
  try {
    const data = response.notification.request.content.data as any;
    if (!data) return;

    let targetRoute = data.deepLink;

    // If no explicit deepLink, construct from entityType and entityId
    if (!targetRoute && data.entityType && data.entityId) {
      if (data.entityType === 'PRODUCT') {
        targetRoute = `/products/${data.entityId}`;
      } else if (data.entityType === 'ORDER') {
        targetRoute = `/orders/${data.entityId}`;
      }
    }

    if (targetRoute) {
      console.log('[PUSH] Opening deep link from push notification:', targetRoute);
      router.push(targetRoute as any);
    } else {
      // Default fallback to notifications list
      router.push('/profile/notifications' as any);
    }
  } catch (err) {
    console.warn('[PUSH] Failed to handle notification response navigation:', err);
  }
}

/**
 * Setup global notification listeners (foreground and tap)
 */
export function setupNotificationListeners(onForegroundNotification?: (notif: Notifications.Notification) => void) {
  // Push notification listeners are only supported on native platforms (Android / iOS)
  if (Platform.OS === 'web') {
    return () => {};
  }

  // Listener for foreground notifications
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[PUSH] Foreground notification received:', notification.request.content.title);
    if (onForegroundNotification) {
      onForegroundNotification(notification);
    }
  });

  // Listener for user tapping on notification (both foreground & background/cold start)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationResponse(response);
  });

  // Also check if app was launched from a notification response (cold start)
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    })
    .catch((err) => {
      console.warn('[PUSH] Error getting last notification response:', err);
    });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
