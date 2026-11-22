// Per-fan preferences (saved matches, follows, match alerts).
// Always kept on the device; also synced to Firestore at users/{uid} when Firebase is on.
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, watchUser } from './firebase.js';
import { followables } from '../data.js';

const KEY = 'wp.prefs';
const DEFAULTS = {
  saved: [],
  following: followables.filter((f) => f.default).map((f) => f.id),
  alerts: true,
};

function readLocal() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function writeLocal(prefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — keep in memory */
  }
}

const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export function useUserPrefs() {
  const [prefs, setPrefs] = useState(readLocal);
  const uidRef = useRef(null);
  const [synced, setSynced] = useState(false);

  // Sign in anonymously, then follow this fan's doc. First visit: upload what's on the device.
  useEffect(() => {
    let stopDoc = () => {};
    const stopAuth = watchUser((user) => {
      stopDoc();
      uidRef.current = user?.uid ?? null;
      if (!user || !db) return;
      const ref = doc(db, 'users', user.uid);
      stopDoc = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            const remote = { ...DEFAULTS, ...snap.data() };
            const next = { saved: remote.saved, following: remote.following, alerts: remote.alerts };
            setPrefs(next);
            writeLocal(next);
          } else {
            setDoc(ref, { ...readLocal(), updatedAt: serverTimestamp() });
          }
          setSynced(true);
        },
        (err) => console.warn('[willowPoint] prefs sync failed:', err.code || err.message),
      );
    });
    return () => {
      stopDoc();
      stopAuth();
    };
  }, []);

  const update = useCallback((change) => {
    setPrefs((current) => {
      const next = { ...current, ...change(current) };
      writeLocal(next);
      if (db && uidRef.current) {
        setDoc(doc(db, 'users', uidRef.current), { ...next, updatedAt: serverTimestamp() }, { merge: true })
          .catch((err) => console.warn('[willowPoint] could not save prefs:', err.code || err.message));
      }
      return next;
    });
  }, []);

  return {
    ...prefs,
    synced,
    toggleSaved: (id) => update((p) => ({ saved: toggleIn(p.saved, id) })),
    toggleFollow: (id) => update((p) => ({ following: toggleIn(p.following, id) })),
    setAlerts: (on) => update(() => ({ alerts: on })),
  };
}
