import { useEffect, useState } from 'react';
import { BottomNav, useStoredState } from './components/ui.jsx';
import HomeScreen from './screens/Home.jsx';
import DiscoverScreen from './screens/Discover.jsx';
import CueScreen from './screens/Cue.jsx';
import ProfileScreen from './screens/Profile.jsx';

export default function App() {
  const [tab, setTab] = useState('home');
  const [discoverFilter, setDiscoverFilter] = useState('All');
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [saved, setSaved] = useStoredState('wp.saved', []);

  const toggleSaved = (id) =>
    setSaved((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

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
    <div className="app">
      {tab === 'home' && <HomeScreen saved={saved} toggleSaved={toggleSaved} go={go} askCue={askCue} />}
      {tab === 'discover' && (
        <DiscoverScreen key={discoverFilter} initialFilter={discoverFilter} saved={saved} toggleSaved={toggleSaved} />
      )}
      {tab === 'cue' && <CueScreen pending={pendingQuestion} clearPending={() => setPendingQuestion(null)} />}
      {tab === 'profile' && <ProfileScreen saved={saved} />}
      <BottomNav tab={tab} onChange={(t) => go(t)} />
    </div>
  );
}
