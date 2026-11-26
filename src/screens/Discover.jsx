import { useEffect } from 'react';
import * as I from '../components/Icons.jsx';
import FixtureRow from '../components/FixtureRow.jsx';
import { LiveScoreboard } from '../components/LiveCard.jsx';
import DiscoverBrowse, { StoryCard } from '../components/DiscoverBrowse.jsx';
import { ScreenMasthead, SectionHead, parts } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { isLiveFixture } from '../lib/fixtures.js';
import { recentResults } from '../lib/selectors.js';
import { kickoffUTC } from '../lib/statcard.js';

const hits = (query, ...fields) => !query || fields.some((field) => String(field || '').toLowerCase().includes(query));

function Matches({ filter, query, saved, toggleSaved, onOpenRecord }) {
  const { today, loadState, liveMatches: allLive, fixtures: allFixtures, results: allResults } = useContent();
  const q = query.trim().toLowerCase();
  const pass = (competition) => filter === 'All' || filter === competition;
  const liveMatches = allLive.filter((match) => hits(q, match.series, match.venue, `${match.batting.name} v ${match.bowling.name}`));
  const fixtures = allFixtures.filter((fixture) => hits(q, fixture.title, fixture.venue, fixture.competition));
  const results = recentResults(allResults, today).filter((result) => hits(q, result.label, result.summary, (result.lines || []).map((line) => line.team).join(' v ')));
  const live = liveMatches.filter((match) => pass(match.competition));
  const todayFixtures = fixtures.filter((fixture) => fixture.date === today && pass(fixture.competition) && !isLiveFixture(fixture, allLive, today));
  const laterToday = todayFixtures.filter((fixture) => (kickoffUTC(fixture.date, fixture.time) ?? Infinity) > Date.now());
  const awaiting = todayFixtures.filter((fixture) => (kickoffUTC(fixture.date, fixture.time) ?? Infinity) <= Date.now());
  const upcoming = fixtures.filter((fixture) => fixture.date > today && pass(fixture.competition));
  const done = results.filter((result) => pass(result.competition));
  const nothing = !live.length && !laterToday.length && !awaiting.length && !upcoming.length && !done.length;
  const todayParts = parts(today);

  return (
    <div className="match-browser">
      {nothing && <p className="empty-state">{loadState === 'loading' ? 'Checking match data…' : loadState === 'error' ? 'Match data could not refresh. Please try again later.' : q ? `No matches for “${query.trim()}”.` : `Nothing current here for ${filter}.`}</p>}

      {(live.length > 0 || laterToday.length > 0 || awaiting.length > 0) && (
        <section>
          <SectionHead title={`Today · ${todayParts.day} ${todayParts.date} ${todayParts.month}`} />
          {live.map((match) => (
            <button type="button" key={match.id} className="livecard discover-live" onClick={() => onOpenRecord({ type: 'live', id: match.id })}>
              <span className="live-meta">{match.series} · {match.venue}</span>
              <LiveScoreboard match={match} />
            </button>
          ))}
          {(laterToday.length > 0 || awaiting.length > 0) && <div className="fixture-list">
            {laterToday.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} today={today} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} />)}
            {awaiting.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} today={today} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} awaiting />)}
          </div>}
        </section>
      )}

      {upcoming.length > 0 && <section><SectionHead title="Upcoming" className="between" /><div className="fixture-list">{upcoming.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} today={today} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} />)}</div></section>}

      {done.length > 0 && (
        <section><SectionHead title="Recent results" className="between" /><div className="result-list">{done.map((result) => (
          <button type="button" key={result.id} className="result-card" onClick={() => onOpenRecord({ type: 'result', id: result.id })}>
            <span className="row-between"><span className="meta-inline">{result.label}</span>{result.status && <span className="mini-chip">{result.status}</span>}</span>
            {(result.lines || []).map((line, index) => <span key={`${line.team}-${index}`} className={`result-line${index ? ' secondary' : ''}`}><span>{line.team}</span><b>{line.score}{line.overs && <small> ({line.overs})</small>}</b></span>)}
            <span className="result-summary">{result.summary}</span><I.Chevron size={15} />
          </button>
        ))}</div><p className="section-footnote">Recent verified results · fixture times NPT</p></section>
      )}
    </div>
  );
}

function News({ query, onOpenRecord }) {
  const q = query.trim().toLowerCase();
  const content = useContent();
  const stories = content.stories.filter((story) => hits(q, story.title, story.source));
  const worldNews = content.worldNews.filter((story) => hits(q, story.title, story.blurb, story.source));
  if (!stories.length && !worldNews.length) return <p className="empty-state">{q ? `No current sourced stories for “${query.trim()}”.` : 'No current, sourced stories are available yet.'}</p>;
  return <div className="news-list discover-news">{[...stories, ...worldNews].map((story) => <StoryCard key={story.id} story={story} onOpen={() => onOpenRecord({ type: 'story', id: story.id })} />)}</div>;
}

const VIEWS = [
  { id: 'browse', label: 'Overview', Icon: I.Grid },
  { id: 'matches', label: 'All fixtures', Icon: I.Calendar },
  { id: 'news', label: 'Stories', Icon: I.ViewList },
];

export default function DiscoverScreen({ filter = 'All', view = 'browse', query = '', onStateChange, saved, toggleSaved, prefs, onOpenRecord, go }) {
  const { competitions } = useContent();
  const filters = ['All', ...competitions];
  const searching = query.trim().length > 0;
  useEffect(() => {
    if (filter !== 'All' && !filters.includes(filter)) onStateChange({ filter: 'All' });
  }, [filter, filters.join('|'), onStateChange]);
  const setView = (nextView) => {
    onStateChange({ view: nextView, filter: nextView === 'matches' ? filter : 'All', query: '' });
    window.scrollTo(0, 0);
  };
  const openSchedule = ({ filter: nextFilter = 'All', query: nextQuery = '' }) => {
    onStateChange({ filter: nextFilter, query: nextQuery, view: 'matches' });
    window.scrollTo(0, 0);
  };

  return (
    <main className="screen discover-screen">
      <ScreenMasthead onProfile={() => go('profile')} />
      <h1 className="disc-h">Discover</h1>
      <p className="disc-sub">Every current match and recent result, in Nepal time.</p>
      <div className="search discover-search"><div className="search-box"><I.Search size={16} /><label className="sr-only" htmlFor="discover-search">Search Discover</label><input id="discover-search" type="search" placeholder="Teams, matches, stories…" value={query} onChange={(event) => onStateChange({ query: event.target.value })} /></div></div>
      <div className="seg" role="tablist" aria-label="Discover sections">
        {VIEWS.map(({ id, label, Icon }) => <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? 'on' : ''} onClick={() => setView(id)}><Icon size={13} />{label}</button>)}
      </div>

      {view === 'browse' && !searching && <DiscoverBrowse saved={saved} toggleSaved={toggleSaved} following={prefs.following} toggleFollow={prefs.toggleFollow} onOpenSchedule={openSchedule} onOpenRecord={onOpenRecord} />}
      {view === 'matches' && <><div className="pills match-filters" aria-label="Match competition">{filters.map((item) => <button key={item} type="button" className={`chip${filter === item ? ' on' : ''}`} aria-pressed={filter === item} onClick={() => onStateChange({ filter: item })}>{item}</button>)}</div><Matches filter={filter} query={query} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} /></>}
      {view === 'browse' && searching && <><Matches filter="All" query={query} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} /><News query={query} onOpenRecord={onOpenRecord} /></>}
      {view === 'news' && <News query={query} onOpenRecord={onOpenRecord} />}
    </main>
  );
}
