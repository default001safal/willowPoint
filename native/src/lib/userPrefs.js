// Saved records and current-topic follows stay on the device and sync to the
// signed-in or anonymous user's own Firestore document. (Native port: AsyncStorage
// replaces localStorage; sync logic identical to the web app.)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, watchUser } from './firebase.js';

const KEY = 'wp.prefs';
const DEFAULTS = { saved: [], following: [], customFollows: [] };

function normalize(value = {}) {
  const list = (items, limit) => [...new Set(Array.isArray(items) ? items.filter((item) => typeof item === 'string' && item.length <= 300) : [])].slice(0, limit);
  return { saved: list(value.saved, 500), following: list(value.following, 50), customFollows: list(value.customFollows, 20) };
}

async function readLocal() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return normalize(raw ? JSON.parse(raw) : DEFAULTS);
  } catch {
    return normalize(DEFAULTS);
  }
}

function writeLocal(prefs) {
  AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {
    // Storage can be unavailable; the in-memory state still works for this visit.
  });
}

const toggleIn = (list, id) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

export function useUserPrefs() {
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const prefsRef = useRef(DEFAULTS);
  const uidRef = useRef(null);
  const readyRef = useRef(false);
  const dirtyRef = useRef(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let alive = true;
    readLocal().then((local) => {
      if (!alive) return;
      prefsRef.current = local;
      setPrefs(local);
      setHydrated(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let stopDoc = () => {};
    const stopAuth = watchUser((user) => {
      stopDoc();
      uidRef.current = user?.uid ?? null;
      readyRef.current = false;
      setSynced(false);
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      stopDoc = onSnapshot(
        ref,
        (record) => {
          if (!readyRef.current) {
            readyRef.current = true;
            if (dirtyRef.current || !record.exists()) {
              const local = prefsRef.current;
              setDoc(ref, { ...local, updatedAt: serverTimestamp() })
                .then(() => { if (prefsRef.current === local) { dirtyRef.current = false; setSynced(true); } })
                .catch((error) => { dirtyRef.current = true; console.warn('[willowPoint] prefs sync failed:', error.code || error.message); });
              return;
            }
          }
          if (dirtyRef.current) return;
          if (record.exists()) {
            const next = normalize(record.data());
            prefsRef.current = next;
            setPrefs(next);
            writeLocal(next);
            setSynced(true);
          }
        },
        (error) => { setSynced(false); console.warn('[willowPoint] prefs sync failed:', error.code || error.message); },
      );
    });
    return () => {
      stopDoc();
      stopAuth();
    };
  }, []);

  const update = useCallback((change) => {
    const next = normalize({ ...prefsRef.current, ...change(prefsRef.current) });
    prefsRef.current = next;
    dirtyRef.current = true;
    setPrefs(next);
    writeLocal(next);
    if (uidRef.current && readyRef.current) {
      setDoc(doc(db, 'users', uidRef.current), { ...next, updatedAt: serverTimestamp() })
        .then(() => { if (prefsRef.current === next) { dirtyRef.current = false; setSynced(true); } })
        .catch((error) => { setSynced(false); console.warn('[willowPoint] could not save prefs:', error.code || error.message); });
    }
  }, []);

  return {
    ...prefs,
    synced,
    hydrated,
    toggleSaved: (id) => update((current) => ({ saved: toggleIn(current.saved, id) })),
    toggleFollow: (id) => update((current) => ({ following: toggleIn(current.following, id) })),
    addCustomFollow: (text) => update((current) => {
      const value = String(text || '').trim().slice(0, 40);
      if (!value || current.customFollows.includes(value)) return {};
      return { customFollows: [...current.customFollows, value] };
    }),
    removeCustomFollow: (text) => update((current) => ({ customFollows: current.customFollows.filter((item) => item !== text) })),
  };
}
