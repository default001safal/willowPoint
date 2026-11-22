// App content: live from Firestore when Firebase is configured, otherwise the snapshot in src/data.js.
import { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';
import * as snapshot from '../data.js';

// Firestore collection → key the screens read. Each doc carries an `order` field for sorting.
const COLLECTIONS = {
  liveMatches: 'liveMatches',
  fixtures: 'fixtures',
  results: 'results',
  stories: 'stories',
  worldNews: 'worldNews',
};

// Today's date in Nepal time (YYYY-MM-DD), so "Today"/"Tomorrow" labels follow NPT.
export function todayNPT(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(now);
}

const fromSnapshot = {
  source: 'snapshot',
  today: snapshot.TODAY,
  liveMatches: snapshot.liveMatches,
  fixtures: snapshot.fixtures,
  results: snapshot.results,
  stories: snapshot.stories,
  worldNews: snapshot.worldNews,
  nplFinal: snapshot.nplFinal,
  featuredEvent: snapshot.featuredEvent,
  teamLogos: {},
};

const empty = {
  source: 'firestore',
  today: todayNPT(),
  liveMatches: [],
  fixtures: [],
  results: [],
  stories: [],
  worldNews: [],
  nplFinal: null,
  featuredEvent: null,
  teamLogos: {},
};

const ContentContext = createContext(fromSnapshot);

export function ContentProvider({ children }) {
  const [content, setContent] = useState(firebaseEnabled ? empty : fromSnapshot);

  useEffect(() => {
    if (!db) return undefined;
    const set = (key, value) => setContent((c) => ({ ...c, [key]: value }));
    const onError = (key) => (err) =>
      console.warn(`[willowPoint] could not load ${key}:`, err.code || err.message);

    const stops = Object.entries(COLLECTIONS).map(([key, name]) =>
      onSnapshot(
        query(collection(db, name), orderBy('order')),
        (snap) => set(key, snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        onError(key),
      ),
    );
    // Featured fixture for Home (the NPL final card). Delete the doc to hide the card.
    stops.push(
      onSnapshot(
        doc(db, 'config', 'featured'),
        (d) => set('nplFinal', d.exists() ? d.data() : null),
        onError('featured'),
      ),
    );
    // The next big event for Home's featured slot.
    stops.push(
      onSnapshot(
        doc(db, 'config', 'event'),
        (d) => set('featuredEvent', d.exists() ? d.data() : null),
        onError('event'),
      ),
    );
    // Official team logos: { "<Team name>": "<image URL>" }. Missing teams fall back to flags/crests.
    stops.push(
      onSnapshot(
        doc(db, 'config', 'teamLogos'),
        (d) => set('teamLogos', d.exists() ? d.data() : {}),
        onError('teamLogos'),
      ),
    );
    // Keep "today" right if the app stays open past midnight NPT.
    const tick = setInterval(() => set('today', todayNPT()), 60_000);
    return () => {
      stops.forEach((stop) => stop());
      clearInterval(tick);
    };
  }, []);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
