
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ======================================================
// ZENIMONIES — SECURE AUTH TOKEN STORAGE
// ======================================================

export const getAuthToken = async (
  key: string
): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('Auth token retrieval failed:', error);
    return null;
  }
};

// ======================================================
// SAVE AUTH TOKEN
// ======================================================

export const setAuthToken = async (
  key: string,
  token: string
): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, token);
    return;
  }

  await SecureStore.setItemAsync(key, token);
};

// ======================================================
// DELETE AUTH TOKEN
// ======================================================

export const deleteAuthToken = async (
  key: string
): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(
      'SecureStore deletion failed. Attempting to invalidate the saved token:',
      error
    );

    // An empty token is treated as no saved session
    // by the application's session restoration logic.
    await SecureStore.setItemAsync(key, '');
  }
};
