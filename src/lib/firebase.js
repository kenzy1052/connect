// src/lib/firebase.js
//
// Firebase app initialization for CampusConnect.
// Only imports the modules we actually use (tree-shaking friendly).
//
// All config values come from Vite env vars (VITE_ prefix = exposed to browser).
// Set these in .env (never commit real values to git).

import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase app (idempotent — safe to call multiple times)
const app = initializeApp(firebaseConfig);

/**
 * Returns the Firebase Messaging instance, or null if the browser doesn't
 * support FCM (e.g. Safari < 16.4, Firefox without push permission).
 *
 * Usage:
 *   const messaging = await getMessagingInstance();
 *   if (!messaging) { ... handle gracefully ... }
 */
export async function getMessagingInstance() {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
}

export { app };
