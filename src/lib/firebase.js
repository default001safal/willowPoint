// Firebase is optional: with no config in .env.local the app runs on the local snapshot in src/data.js.
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);

export const app = firebaseEnabled ? initializeApp(config) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

// Every visitor gets an anonymous account so saves and follows can sync to Firestore.
// It can be upgraded to Google / phone sign-in later without losing their data.
export function watchUser(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  const stop = onAuthStateChanged(auth, (user) => {
    if (user) callback(user);
    else signInAnonymously(auth).catch((err) => {
      console.warn('[willowPoint] anonymous sign-in failed:', err.code || err.message);
      callback(null);
    });
  });
  return stop;
}
