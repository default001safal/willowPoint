// Content provider: live Firestore listeners + derived display state.
// Identical data flow to the web app; React Context works unchanged on native.
import { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebase.js';
import { livePresentation } from './liveState.js';
import { currentStories } from './storyState.js';
import { competitionFilters, followTopics, selectFeaturedEvent } from './selectors.js';

const COLLECTIONS = {
  liveMatches: 'liveMatches',
  fixtures: 'fixtures',
  events: 'events',
  results: 'results',
  stories: 'stories',
  worldNews: 'worldNews',
};

export function todayNPT(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(now);
}

const initialContent = {
  source: 'firestore',
  today: todayNPT(),
  liveMatches: [],
  fixtures: [],
  events: [],
  results: [],
  stories: [],
  worldNews: [],
  featuredEvent: null,
  competitions: [],
  followTopics: [],
  teamLogos: {},
  feed: null,
  loadState: 'loading',
};

const ContentContext = createContext(initialContent);

export function ContentProvider({ children }) {
  const [content, setContent] = useState(initialContent);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const set = (key, value) => setContent((current) => ({ ...current, [key]: value }));
    const pending = new Set([...Object.keys(COLLECTIONS), 'teamLogos', 'feed']);
    const failed = new Set();
    // Offline Firestore listeners can remain pending rather than calling their
    // error callback. Bound the initial wait without blocking later recovery.
    const loadingTimeout = setTimeout(() => {
      if (pending.size) set('loadState', 'error');
    }, 15_000);
    const settle = (key, error) => {
      pending.delete(key);
      if (error) failed.add(key);
      else failed.delete(key);
      if (pending.size === 0) set('loadState', failed.size ? 'error' : 'ready');
    };
    const onError = (key) => (error) => {
      console.warn(`[willowPoint] could not load ${key}:`, error.code || error.message);
      settle(key, error);
    };

    const stops = Object.entries(COLLECTIONS).map(([key, name]) => onSnapshot(
      query(collection(db, name), orderBy('order')),
      (records) => {
        set(key, records.docs.map((record) => ({ id: record.id, ...record.data() })));
        settle(key);
      },
      onError(key),
    ));

    [['teamLogos', 'teamLogos'], ['feed', 'feed']].forEach(([documentName, key]) => {
      stops.push(onSnapshot(
        doc(db, 'config', documentName),
        (record) => {
          set(key, record.exists() ? record.data() : key === 'teamLogos' ? {} : null);
          settle(documentName);
        },
        onError(documentName),
      ));
    });

    const tick = setInterval(() => {
      set('today', todayNPT());
      setNow(Date.now());
    }, 60_000);
    return () => {
      stops.forEach((stop) => stop());
      clearTimeout(loadingTimeout);
      clearInterval(tick);
    };
  }, []);

  const live = livePresentation(content.liveMatches, content.feed, now);
  const display = {
    ...content,
    stories: currentStories(content.stories, now),
    worldNews: currentStories(content.worldNews, now),
    featuredEvent: selectFeaturedEvent(content.events, content.fixtures, content.today),
    competitions: competitionFilters(content, content.today),
    followTopics: followTopics(content, content.today),
  };

  return (
    <ContentContext.Provider value={{ ...display, liveMatches: live.matches, liveState: live.state }}>
      {children}
    </ContentContext.Provider>
  );
}

export const useContent = () => useContext(ContentContext);
