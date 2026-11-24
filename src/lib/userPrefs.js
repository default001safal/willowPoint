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
  alerts: false,
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
  const prefsRef = useRef(prefs);
  const uidRef = useRef(null);
  const readyRef = useRef(false);
  const dirtyRef = useRef(false);
  const [synced, setSynced] = useState(false);

  // Sign in anonymously, then follow this fan's doc. First visit: upload what's on the device.
  useEffect(() => {
    let stopDoc = () => {};
    const stopAuth = watchUser((user) => {
      stopDoc();
      uidRef.current = user?.uid ?? null;
      readyRef.current = false;
      setSynced(false);
      if (!user || !db) return;
      const ref = doc(db, 'users', user.uid);
      stopDoc = onSnapshot(
        ref,
        (snap) => {
          if (!readyRef.current) {
            readyRef.current = true;
            if (dirtyRef.current || !snap.exists()) {
              const local = prefsRef.current;
              setDoc(ref, { ...local, updatedAt: serverTimestamp() }, { merge: true })
                .then(() => { if (prefsRef.current === local) { dirtyRef.current = false; setSynced(true); } })
                .catch((err) => { dirtyRef.current = true; console.warn('[willowPoint] prefs sync failed:', err.code || err.message); });
              return;
            }
          }
          if (dirtyRef.current) return;
          if (snap.exists()) {
            const remote = { ...DEFAULTS, ...snap.data() };
            const next = {
              saved: Array.isArray(remote.saved) ? remote.saved : [],
              following: Array.isArray(remote.following) ? remote.following : [],
              alerts: typeof remote.alerts === 'boolean' ? remote.alerts : false,
            };
            prefsRef.current = next;
            setPrefs(next);
            writeLocal(next);
            setSynced(true);
          }
        },
        (err) => { setSynced(false); console.warn('[willowPoint] prefs sync failed:', err.code || err.message); },
      );
    });
    return () => {
      stopDoc();
      stopAuth();
    };
  }, []);

  const update = useCallback((change) => {
    const next = { ...prefsRef.current, ...change(prefsRef.current) };
    prefsRef.current = next;
    dirtyRef.current = true;
    setPrefs(next);
    writeLocal(next);
    if (db && uidRef.current && readyRef.current) {
      setDoc(doc(db, 'users', uidRef.current), { ...next, updatedAt: serverTimestamp() }, { merge: true })
        .then(() => { if (prefsRef.current === next) { dirtyRef.current = false; setSynced(true); } })
        .catch((err) => { setSynced(false); console.warn('[willowPoint] could not save prefs:', err.code || err.message); });
    }
  }, []);

  return {
    ...prefs,
    synced,
    toggleSaved: (id) => update((p) => ({ saved: toggleIn(p.saved, id) })),
    toggleFollow: (id) => update((p) => ({ following: toggleIn(p.following, id) })),
    setAlerts: (on) => update(() => ({ alerts: on })),
  };
}
