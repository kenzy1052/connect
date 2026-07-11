// src/lib/firebase.js
//
// Firebase is LAZY-LOADED. Nothing here is imported at module scope, so the
// Firebase SDK (a large dependency) is NOT included in the initial vendor
// bundle. It is only fetched the first time a user actually interacts with
// push notifications (opts in, or we re-hydrate an existing subscription).
//
// All config values come from Vite env vars (VITE_ prefix = exposed to browser).

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let _appPromise = null;

// Initialise the Firebase app on first use (dynamic import → separate chunk).
async function getApp() {
  if (!_appPromise) {
    _appPromise = import("firebase/app").then(({ initializeApp }) =>
      initializeApp(firebaseConfig),
    );
  }
  return _appPromise;
}

/**
 * Returns the Firebase Messaging instance, or null if the browser doesn't
 * support FCM. Both firebase/app and firebase/messaging are code-split and
 * only downloaded when this is called.
 */
export async function getMessagingInstance() {
  try {
    const { getMessaging, isSupported } = await import("firebase/messaging");
    const supported = await isSupported();
    if (!supported) return null;
    const app = await getApp();
    return getMessaging(app);
  } catch {
    return null;
  }
}

// Re-exported lazily so callers don't statically import firebase/messaging.
export async function fcm() {
  return import("firebase/messaging");
}

export { getApp };
