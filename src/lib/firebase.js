// Firebase web config for project willowpoint-ff851.
// These values are public by design (they ship to every browser); access is controlled by
// firestore.rules. Override any of them with VITE_FIREBASE_* in .env.local, or set
// VITE_FIREBASE_DISABLED=true to run on the local snapshot in src/data.js.
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = import.meta.env || {};

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDbWwOYpV56bVUmofjyWJ8iQXGmscdziOo',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'willowpoint-ff851.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'willowpoint-ff851',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'willowpoint-ff851.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1075101771205',
  appId: env.VITE_FIREBASE_APP_ID || '1:1075101771205:web:6402bb0da9dbf409abd7ac',
};

export const firebaseEnabled = env.VITE_FIREBASE_DISABLED !== 'true';

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
