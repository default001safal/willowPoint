import { useEffect, useState } from 'react';
import { BottomNav } from './components/ui.jsx';
import { ContentProvider } from './lib/content.jsx';
import { useUserPrefs } from './lib/userPrefs.js';
import HomeScreen from './screens/Home.jsx';
import DiscoverScreen from './screens/Discover.jsx';
import CueScreen from './screens/Cue.jsx';
import ProfileScreen from './screens/Profile.jsx';

export default function App() {
  const [tab, setTab] = useState('home');
  const [discoverFilter, setDiscoverFilter] = useState('All');
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const prefs = useUserPrefs();

  const go = (next, filter) => {
    if (next === 'discover') setDiscoverFilter(filter || 'All');
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
          <DiscoverScreen key={discoverFilter} initialFilter={discoverFilter} saved={prefs.saved} toggleSaved={prefs.toggleSaved} />
        )}
        {tab === 'cue' && <CueScreen pending={pendingQuestion} clearPending={() => setPendingQuestion(null)} />}
        {tab === 'profile' && <ProfileScreen prefs={prefs} />}
        <BottomNav tab={tab} onChange={(t) => go(t)} />
      </div>
    </ContentProvider>
  );
}
