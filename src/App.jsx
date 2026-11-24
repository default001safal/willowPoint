import { useEffect, useState } from 'react';
import { BottomNav } from './components/ui.jsx';
import { ContentProvider } from './lib/content.jsx';
import { useUserPrefs } from './lib/userPrefs.js';
import HomeScreen from './screens/Home.jsx';
import DiscoverScreen from './screens/Discover.jsx';
import CueScreen from './screens/Cue.jsx';
import ProfileScreen from './screens/Profile.jsx';
import Onboarding, { needsOnboarding } from './components/Onboarding.jsx';
import Splash from './components/Splash.jsx';

export default function App() {
  // ?tab=discover|cue|profile opens straight on that tab (handy for links and reviews).
  const [tab, setTab] = useState(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      return ['home', 'discover', 'cue', 'profile'].includes(t) ? t : 'home';
    } catch {
      return 'home';
    }
  });
  const [discoverFilter, setDiscoverFilter] = useState('All');
  const [discoverView, setDiscoverView] = useState('browse');
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const prefs = useUserPrefs();
  const [welcome, setWelcome] = useState(needsOnboarding);
  const [splash, setSplash] = useState(true);
  // ?bg=ink|moss|stone swaps the background palette; no value keeps the black one.
  useEffect(() => {
    try {
      const bg = new URLSearchParams(window.location.search).get('bg');
      if (/^(black|ink|moss|stone-warm|g-(aurora|dawn|floodlight|edge|mesh))$/.test(bg || '')) document.documentElement.dataset.bg = bg;
    } catch { /* no query string available */ }
  }, []);

  const go = (next, filter, query = '') => {
    if (next === 'discover') {
      setDiscoverFilter(filter && filter !== 'News' ? filter : 'All');
      setDiscoverView(filter === 'News' ? 'news' : filter ? 'matches' : 'browse');
      setDiscoverQuery(query);
    }
    setTab(next);
  };

  const askCue = (question) => {
    setPendingQuestion(question);
    setTab('cue');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <ContentProvider>
      <div className="app">
        {tab === 'home' && <HomeScreen saved={prefs.saved} toggleSaved={prefs.toggleSaved} go={go} askCue={askCue} />}
        {tab === 'discover' && (
          <DiscoverScreen key={`${discoverView}-${discoverFilter}-${discoverQuery}`} initialFilter={discoverFilter} initialView={discoverView} initialQuery={discoverQuery} saved={prefs.saved} toggleSaved={prefs.toggleSaved} prefs={prefs} />
        )}
        {tab === 'cue' && <CueScreen pending={pendingQuestion} clearPending={() => setPendingQuestion(null)} />}
        {tab === 'profile' && <ProfileScreen prefs={prefs} />}
        <BottomNav tab={tab} onChange={(t) => go(t)} />
        {welcome && <Onboarding prefs={prefs} onDone={() => setWelcome(false)} />}
        {splash && <Splash onDone={() => setSplash(false)} />}
      </div>
    </ContentProvider>
  );
}
