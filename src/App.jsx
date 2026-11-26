import { useEffect, useRef, useState } from 'react';
import { BottomNav } from './components/ui.jsx';
import RecordLayers from './components/RecordLayers.jsx';
import { ContentProvider } from './lib/content.jsx';
import { useUserPrefs } from './lib/userPrefs.js';
import HomeScreen from './screens/Home.jsx';
import DiscoverScreen from './screens/Discover.jsx';
import CueScreen from './screens/Cue.jsx';
import ProfileScreen from './screens/Profile.jsx';
import Onboarding, { needsOnboarding } from './components/Onboarding.jsx';
import Splash from './components/Splash.jsx';

const TABS = ['home', 'discover', 'cue', 'profile'];

function initialTab() {
  try {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return TABS.includes(tab) ? tab : 'home';
  } catch {
    return 'home';
  }
}

function tabUrl(tab) {
  const url = new URL(window.location.href);
  if (tab === 'home') url.searchParams.delete('tab');
  else url.searchParams.set('tab', tab);
  return url;
}

export default function App() {
  const [tab, setTab] = useState(initialTab);
  const [discoverFilter, setDiscoverFilter] = useState('All');
  const [discoverView, setDiscoverView] = useState('browse');
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [layers, setLayers] = useState([]);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const prefs = useUserPrefs();
  const [welcome, setWelcome] = useState(needsOnboarding);
  const [splash, setSplash] = useState(true);
  const scrollPositions = useRef({ home: 0, discover: 0, cue: 0, profile: 0 });
  const discover = { filter: discoverFilter, view: discoverView, query: discoverQuery };

  // ?bg=ink|moss|stone swaps the background palette; no value keeps the black one.
  useEffect(() => {
    try {
      const bg = new URLSearchParams(window.location.search).get('bg');
      if (/^(black|ink|moss|stone-warm|g-(aurora|dawn|floodlight|edge|mesh))$/.test(bg || '')) document.documentElement.dataset.bg = bg;
    } catch { /* no query string available */ }
  }, []);

  useEffect(() => {
    const initialDiscover = { filter: 'All', view: 'browse', query: '' };
    window.history.replaceState({ willowPoint: true, tab, layers: [], discover: initialDiscover }, '', window.location.href);
    const onPopState = (event) => {
      const state = event.state;
      if (!state?.willowPoint) return;
      if (TABS.includes(state.tab)) setTab(state.tab);
      setLayers(Array.isArray(state.layers) ? state.layers : []);
      if (state.discover) {
        setDiscoverFilter(state.discover.filter || 'All');
        setDiscoverView(state.discover.view || 'browse');
        setDiscoverQuery(state.discover.query || '');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo(0, scrollPositions.current[tab] || 0);
  }, [tab]);

  const go = (next, filter, query = '') => {
    if (!TABS.includes(next)) return;
    scrollPositions.current[tab] = window.scrollY;
    const nextDiscover = { ...discover };
    if (next === 'discover' && (filter !== undefined || query)) {
      nextDiscover.filter = filter && filter !== 'News' ? filter : 'All';
      nextDiscover.view = filter === 'News' ? 'news' : filter ? 'matches' : 'browse';
      nextDiscover.query = query;
      setDiscoverFilter(nextDiscover.filter);
      setDiscoverView(nextDiscover.view);
      setDiscoverQuery(nextDiscover.query);
    }
    setLayers([]);
    setTab(next);
    window.history.pushState(
      { willowPoint: true, tab: next, layers: [], discover: nextDiscover },
      '',
      tabUrl(next),
    );
  };

  const updateDiscover = ({ filter = discoverFilter, view = discoverView, query = discoverQuery }) => {
    const next = { filter, view, query };
    setDiscoverFilter(filter);
    setDiscoverView(view);
    setDiscoverQuery(query);
    if (window.history.state?.willowPoint) {
      window.history.replaceState({ ...window.history.state, tab: 'discover', discover: next }, '', window.location.href);
    }
  };

  const openLayer = (layer) => {
    const nextLayers = [...layers, layer];
    setLayers(nextLayers);
    window.history.pushState({
      willowPoint: true,
      tab,
      layers: nextLayers,
      discover,
    }, '', window.location.href);
  };

  const closeLayer = () => {
    if (window.history.state?.willowPoint && window.history.state.layers?.length) {
      window.history.back();
    } else {
      setLayers((current) => current.slice(0, -1));
    }
  };

  const askCue = (question) => {
    setPendingQuestion(question);
    go('cue');
  };

  const openSaved = () => {
    scrollPositions.current[tab] = window.scrollY;
    const nextLayers = [{ type: 'saved' }];
    setTab('profile');
    setLayers(nextLayers);
    window.history.pushState({ willowPoint: true, tab: 'profile', layers: nextLayers, discover }, '', tabUrl('profile'));
  };

  const answerOpen = layers.some((layer) => layer.type === 'cue-answer');
  const recordLayerOpen = layers.some((layer) => !layer.type.startsWith('cue-'));
  const sourceLayer = [...layers].reverse().find((layer) => layer.type === 'cue-source')?.source || null;
  const openAnswer = () => {
    if (!answerOpen) openLayer({ type: 'cue-answer' });
  };

  return (
    <ContentProvider>
      <div className="app">
        <div hidden={tab !== 'home'} inert={layers.length ? '' : undefined} aria-hidden={layers.length ? true : undefined}>
          <HomeScreen saved={prefs.saved} toggleSaved={prefs.toggleSaved} go={go} askCue={askCue} onOpenSaved={openSaved} onOpenRecord={openLayer} />
        </div>
        <div hidden={tab !== 'discover'} inert={layers.length ? '' : undefined} aria-hidden={layers.length ? true : undefined}>
          <DiscoverScreen filter={discoverFilter} view={discoverView} query={discoverQuery} onStateChange={updateDiscover} saved={prefs.saved} toggleSaved={prefs.toggleSaved} prefs={prefs} onOpenRecord={openLayer} />
        </div>
        <div hidden={tab !== 'cue'} inert={recordLayerOpen ? '' : undefined} aria-hidden={recordLayerOpen ? true : undefined}>
          <CueScreen
            pending={pendingQuestion}
            clearPending={() => setPendingQuestion(null)}
            answerOpen={answerOpen}
            sourceLayer={sourceLayer}
            onOpenAnswer={openAnswer}
            onCloseAnswer={closeLayer}
            onOpenSource={(source) => openLayer({ type: 'cue-source', source })}
            onCloseSource={closeLayer}
          />
        </div>
        <div hidden={tab !== 'profile'} inert={layers.length ? '' : undefined} aria-hidden={layers.length ? true : undefined}>
          <ProfileScreen prefs={prefs} onOpenSaved={openSaved} onOpenAccount={() => openLayer({ type: 'account' })} />
        </div>
        {!layers.length && <BottomNav tab={tab} onChange={(next) => go(next)} />}
        <RecordLayers layers={layers} prefs={prefs} onClose={closeLayer} onOpenLayer={openLayer} askCue={askCue} go={go} />
        {welcome && <Onboarding prefs={prefs} onDone={() => setWelcome(false)} />}
        {splash && <Splash onDone={() => setSplash(false)} />}
      </div>
    </ContentProvider>
  );
}
