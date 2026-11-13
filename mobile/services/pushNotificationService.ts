
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL =
  'https://zenimonies-banking.onrender.com/api';

const EAS_PROJECT_ID =
  'f5a1b03e-8b9b-48de-b2dd-caaf6df71051';

const PUSH_TOKEN_KEY =
  'zenimonies_expo_push_token';

// ======================================================
// REGISTER DEVICE FOR PUSH NOTIFICATIONS
// ======================================================

export const registerPushNotifications = async (
  authToken: string
): Promise<{
  success: boolean;
  permissionDenied?: boolean;
  message: string;
}> => {
  try {
    if (
      Platform.OS !== 'ios' &&
      Platform.OS !== 'android'
    ) {
      return {
        success: false,
        message: 'Push notifications require an iOS or Android device.',
      };
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(
        'default',
        {
          name: 'ZENIMONIES Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        }
      );
    }

    let permission =
      await Notifications.getPermissionsAsync();

    if (!permission.granted) {
      permission =
        await Notifications.requestPermissionsAsync();
    }

    if (!permission.granted) {
      return {
        success: false,
        permissionDenied: true,
        message: 'Notification permission was not granted.',
      };
    }

    const tokenResult =
      await Notifications.getExpoPushTokenAsync({
        projectId: EAS_PROJECT_ID,
      });

    const expoPushToken = tokenResult.data;

    const response = await fetch(
      `${API_URL}/push-devices/register`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          expo_push_token: expoPushToken,
          platform: Platform.OS,
        }),
      }
    );

    let data: any = {};

    try {
      data = await response.json();
    } catch {
      // Handle an invalid server response below.
    }

    if (!response.ok || data.success !== true) {
      throw new Error(
        data.message ||
          'The device could not be registered.'
      );
    }

    await SecureStore.setItemAsync(
      PUSH_TOKEN_KEY,
      expoPushToken
    );

    return {
      success: true,
      message: 'This device is registered for ZENIMONIES notifications.',
    };
  } catch (error: any) {
    // Never log or expose the actual push token.
    return {
      success: false,
      message:
        error?.message ||
        'Unable to register push notifications.',
    };
  }
};

// ======================================================
// UNREGISTER DEVICE
// ======================================================

export const unregisterPushNotifications = async (
  authToken: string
): Promise<boolean> => {
  try {
    const expoPushToken =
      await SecureStore.getItemAsync(PUSH_TOKEN_KEY);

    if (!expoPushToken) {
      return true;
    }

    const response = await fetch(
      `${API_URL}/push-devices`,
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          expo_push_token: expoPushToken,
        }),
      }
    );

    if (!response.ok) {
      return false;
    }

    await SecureStore.deleteItemAsync(
      PUSH_TOKEN_KEY
    );

    return true;
  } catch {
    return false;
  }
};
