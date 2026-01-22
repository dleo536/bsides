// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA3mfXXUHksi3h3GtRwfgmiTM0oOjzFcb4",
  authDomain: "b-sides-9cb91.firebaseapp.com",
  projectId: "b-sides-9cb91",
  storageBucket: "b-sides-9cb91.firebasestorage.app",
  messagingSenderId: "50184648070",
  appId: "1:50184648070:web:51fd4b8ad1c21bdf63a807",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Cloud Firestore
const db = getFirestore(app);

export { auth, app, db };
