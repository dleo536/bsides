import { getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase's recommended React Native persistence path is AsyncStorage.
// This keeps users signed in across cold app restarts until they explicitly
// sign out, clear app data, reinstall, or their auth is revoked server-side.
export const firebaseAuthPersistence =
  getReactNativePersistence(AsyncStorage);
