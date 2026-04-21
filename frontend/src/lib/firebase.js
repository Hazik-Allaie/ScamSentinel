import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isFirebaseConfigured = !!firebaseConfig.apiKey;
let app;
let db;
let auth;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Automatically sign in anonymously
    signInAnonymously(auth)
      .then(() => {
        console.log("Firebase anonymous auth successful");
      })
      .catch((error) => {
        console.warn("Firebase auth error (non-fatal):", error.message);
      });
  } catch (error) {
    console.warn("Firebase initialization failed (non-fatal):", error.message);
    console.warn("Some features (feed, community data) will be unavailable. Set VITE_FIREBASE_* env vars to enable.");
  }
} else {
  console.warn("Firebase API Key missing. Some features will use REST fallbacks.");
}

export { db, auth, isFirebaseConfigured };
