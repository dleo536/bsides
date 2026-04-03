import { getReactNativePersistence } from "firebase/auth";
import * as SecureStore from "expo-secure-store";

const SECURE_STORE_KEY_PREFIX = "firebase-auth:";
const SECURE_STORE_OPTIONS = {
  keychainService: "bsides.firebase.auth",
};

const getSecureStoreKey = (key) =>
  `${SECURE_STORE_KEY_PREFIX}${encodeURIComponent(key)}`;

const secureStorage = {
  async setItem(key, value) {
    return SecureStore.setItemAsync(
      getSecureStoreKey(key),
      value,
      SECURE_STORE_OPTIONS
    );
  },

  async getItem(key) {
    return SecureStore.getItemAsync(
      getSecureStoreKey(key),
      SECURE_STORE_OPTIONS
    );
  },

  async removeItem(key) {
    return SecureStore.deleteItemAsync(
      getSecureStoreKey(key),
      SECURE_STORE_OPTIONS
    );
  },
};

export const firebaseAuthPersistence =
  getReactNativePersistence(secureStorage);
