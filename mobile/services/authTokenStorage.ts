
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const getAuthToken = async (
  key: string
): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};

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

export const deleteAuthToken = async (
  key: string
): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
};
