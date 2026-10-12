/**
 * Unified Safe Storage Utility
 * Uses Expo SecureStore on Native platforms and automatically falls back
 * to AsyncStorage on Web or whenever SecureStore is unavailable/fails.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      // SecureStore failed, rely on AsyncStorage
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // AsyncStorage failed
    }
  },

  async getItem(key: string): Promise<string | null> {
    // 1. Try SecureStore on Native
    if (Platform.OS !== 'web') {
      try {
        const val = await SecureStore.getItemAsync(key);
        if (val) return val;
      } catch {
        // Fall back to AsyncStorage
      }
    }

    // 2. Fall back to AsyncStorage
    try {
      const val = await AsyncStorage.getItem(key);
      if (val) return val;
    } catch {
      // Return null
    }

    return null;
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS !== 'web') {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Ignore
      }
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};
