import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAvIw3xHeqCFl1jYmJ63iU-KsFFDGNP5hI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "online-street-wear.firebaseapp.com",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://online-street-wear-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "online-street-wear",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "online-street-wear.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "373624524818",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:373624524818:web:d07a192a6ae9b144c808cb",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-W83LTHWYVG",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

const app = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;

if (googleProvider) {
  googleProvider.setCustomParameters({ prompt: "select_account" });
}

export const db = app ? getFirestore(app) : null;
