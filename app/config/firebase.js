// Import the functions you need from the SDKs you need
import * as firebase from "firebase/app";
import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

 import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGrAMdhz6_Pkz0JEx_Krii0_EOlappyGw",
  authDomain: "b-sides-9cb91.firebaseapp.com",
  projectId: "b-sides-9cb91",
  storageBucket: "b-sides-9cb91.appspot.com",
  messagingSenderId: "50184648070",
  appId: "1:50184648070:web:51fd4b8ad1c21bdf63a807"
};

// Initialize Firebase 
//Using firebase 10.3 or something so this might be different syntax
const app = initializeApp(firebaseConfig);

//const auth = getAuth(app);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { auth, app, db };
