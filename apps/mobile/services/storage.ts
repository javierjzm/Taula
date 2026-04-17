import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore write errors in constrained environments
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore remove errors in constrained environments
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
