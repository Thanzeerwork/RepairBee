/**
 * RepairBee Push Notifications Service
 * Integrates Expo Notifications + FCM / APNs device token registration
 * Safely guarded for Expo Go, development builds, and standalone production builds.
 */
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { api } from '../api/client';
import { storage } from './storage';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isExpoGoAndroid = isExpoGo && Platform.OS === 'android';

// In Expo SDK 53+, remote push notifications were removed from Expo Go on Android.
// Importing expo-notifications on Android in Expo Go triggers an immediate throw at module load.
// We dynamically require expo-notifications only in supported environments (Dev Client, standalone APK, iOS).
let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGoAndroid) {
  try {
    Notifications = require('expo-notifications');
  } catch (err) {
    if (__DEV__) {
      console.warn('[Notifications] expo-notifications not loaded in this environment');
    }
  }
}

// 1. Configure foreground notification presentation handler safely
if (Notifications?.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (err) {
    if (__DEV__) {
      console.warn('[Notifications] setNotificationHandler skipped in current runtime');
    }
  }
}

/**
 * Register device for push notifications and sync token with RepairBee backend
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    if (isExpoGoAndroid || !Notifications) {
      if (__DEV__) {
        console.log(
          'ℹ️ [Notifications] Running in Expo Go on Android: Remote FCM push tokens require a development build (EAS Build). In-app alerts are active.'
        );
      }
      return null;
    }

    // Android requires explicit notification channels
    if (Platform.OS === 'android') {
      try {
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
      } catch (channelErr) {
        // Channel creation may be limited in Expo Go
      }
    }

    if (!Device.isDevice) {
      if (__DEV__) {
        console.log('ℹ️ [Notifications] Simulators use local notification triggers.');
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
        console.log('⚠️ [Notifications] Permission not granted by user.');
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
        // Silent fallback in restricted runtimes
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
      console.warn('[Notifications] Registration error:', err?.message || err);
    }
  }

  return token;
}

/**
 * Setup listeners for incoming foreground notifications and notification taps (deep linking)
 */
export function setupNotificationListeners(onNavigate: (route: string) => void) {
  if (!Notifications?.addNotificationResponseReceivedListener) {
    return () => {};
  }
  try {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.orderId && (data?.type === 'quote' || data?.target === 'quote')) {
        onNavigate(`/quote/${data.orderId}`);
      } else if (data?.orderId && (data?.type === 'tracking' || data?.target === 'tracking')) {
        onNavigate(`/tracking/${data.orderId}`);
      } else if (data?.orderId) {
        onNavigate(`/order/${data.orderId}`);
      } else if (typeof data?.route === 'string') {
        onNavigate(data.route);
      }
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      if (__DEV__) {
        console.log('🔔 [Foreground Notification Received]:', notification.request.content.title);
      }
    });

    return () => {
      try {
        responseSub.remove();
        receivedSub.remove();
      } catch {}
    };
  } catch (err) {
    return () => {};
  }
}

/**
 * Trigger an immediate local notification banner (works in Expo Go, Dev Client, & Production)
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
  if (!Notifications?.scheduleNotificationAsync) {
    if (__DEV__) {
      console.log(`🔔 [Notification simulated in Expo Go Android]: ${title} - ${body}`);
    }
    return;
  }
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
