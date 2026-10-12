/**
 * RepairBee Push Notifications Service
 * Integrates Expo Notifications + FCM / APNs device token registration
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../api/client';
import { storage } from './storage';

// 1. Configure foreground notification presentation handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register device for push notifications and sync token with RepairBee backend
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    // Android requires explicit notification channels
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'RepairBee General Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#fc8019',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Repair Orders & Quotes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#fc8019',
        sound: 'default',
        enableVibrate: true,
      });

      await Notifications.setNotificationChannelAsync('telemetry', {
        name: 'Courier Delivery Telemetry',
        importance: Notifications.AndroidImportance.LOW,
        sound: undefined,
        enableVibrate: false,
      });
    }

    if (!Device.isDevice) {
      if (__DEV__) {
        console.log('ℹ️ Push notifications: Emulators/simulators use local notification triggers.');
      }
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      if (__DEV__) {
        console.log('⚠️ Notification permission not granted by user.');
      }
      return null;
    }

    // Retrieve Expo Push Token
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = pushTokenData.data;
    } catch (tokenErr) {
      // Fallback to native device token if Expo push service is unreachable
      try {
        const deviceTokenData = await Notifications.getDevicePushTokenAsync();
        token = deviceTokenData.data;
      } catch (deviceErr) {
        if (__DEV__) {
          console.warn('Unable to get push token:', deviceErr);
        }
      }
    }

    if (token) {
      if (__DEV__) {
        console.log('📱 [Push Token Registered]:', token);
      }
      // Save locally
      await storage.setItem('pushToken', token);

      // Sync with backend database
      try {
        await api.updatePushToken(token);
      } catch (syncErr) {
        // Non-blocking: will sync on next login / profile refresh
      }
    }
  } catch (err: any) {
    if (__DEV__) {
      console.warn('Push notification registration error:', err?.message || err);
    }
  }

  return token;
}

/**
 * Trigger an immediate in-app local notification alert (useful for test triggers & live status simulation)
 */
export async function triggerLocalNotification({
  title,
  body,
  data = {},
}: {
  title: string;
  body: string;
  data?: Record<string, any>;
}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // trigger immediately
    });
  } catch (err) {
    if (__DEV__) {
      console.warn('Failed to schedule local notification:', err);
    }
  }
}
