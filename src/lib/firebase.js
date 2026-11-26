// Firebase's web configuration identifies the project; Firestore rules control access.
import { initializeApp } from 'firebase/app';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
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

export const app = initializeApp(config);
export const db = getFirestore(app);
export const auth = getAuth(app);

export function watchUser(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(user);
      return;
    }
    signInAnonymously(auth).catch((error) => {
      console.warn('[willowPoint] anonymous sign-in failed:', error.code || error.message);
      callback(null);
    });
  });
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    const credential = await linkWithPopup(current, provider);
    return credential.user;
  }
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function signInWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function createAccountWithEmail(email, password) {
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    const identity = EmailAuthProvider.credential(email.trim(), password);
    const credential = await linkWithCredential(current, identity);
    return credential.user;
  }
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export function signOutUser() {
  return firebaseSignOut(auth);
}

export function authErrorMessage(error) {
  const messages = {
    'auth/operation-not-allowed': 'This sign-in method is not enabled for the project yet.',
    'auth/popup-closed-by-user': '',
    'auth/cancelled-popup-request': '',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/wrong-password': 'The email or password is incorrect.',
    'auth/user-not-found': 'No account uses that email. Choose Create account instead.',
    'auth/email-already-in-use': 'An account already uses that email. Choose Sign in instead.',
    'auth/credential-already-in-use': 'An account already uses that email. Sign in to that account instead.',
    'auth/weak-password': 'Use a password with at least six characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'Check your connection and try again.',
  };
  return messages[error?.code] ?? error?.message ?? 'Authentication failed. Check your connection and try again.';
}
