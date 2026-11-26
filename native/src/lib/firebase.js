// Firebase's client configuration identifies the project; Firestore rules control access.
// Google sign-in on native uses expo-auth-session (browser redirect) and exchanges the
// Google ID token with Firebase; email/password and anonymous auth use the JS SDK directly.
import { initializeApp } from 'firebase/app';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDbWwOYpV56bVUmofjyWJ8iQXGmscdziOo',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'willowpoint-ff851.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'willowpoint-ff851',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'willowpoint-ff851.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1075101771205',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1075101771205:web:6402bb0da9dbf409abd7ac',
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

// Native Google sign-in: expo-auth-session returns a Google ID token in the redirect;
// Firebase trades it for a session. Configured in app.json extra.googleClientId.
export async function signInWithGoogleIdToken(idToken) {
  const credential = GoogleAuthProvider.credential(idToken);
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    const linked = await linkWithCredential(current, credential);
    return linked.user;
  }
  const result = await import('firebase/auth').then(({ signInWithCredential }) => signInWithCredential(auth, credential));
  return result.user;
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

export { OAuthProvider };

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
