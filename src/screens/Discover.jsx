import * as I from '../components/Icons.jsx';
import { Divider, SaveButton, addDays, parts, relativeDay } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { isLiveFixture } from '../lib/fixtures.js';
import { kickoffUTC } from '../lib/statcard.js';
import { MarkPair, TeamMark } from '../components/TeamMark.jsx';
import { LiveTiles } from '../components/LiveCard.jsx';
import DiscoverBrowse from '../components/DiscoverBrowse.jsx';
import './Discover.css';

const FILTERS = [
  { id: 'All', icon: <I.Grid size={14} /> },
  { id: 'Nepal', icon: <TeamMark name="Nepal" size={15} /> },
  { id: 'NPL', icon: <I.Trophy size={14} /> },
  { id: 'Nepal Women', icon: <I.Female size={14} /> },
  { id: 'Nepal U19', icon: <I.CricketBat size={14} /> },
  { id: 'League 2', icon: <I.CricketBall size={14} /> },
  { id: 'World', icon: <I.Globe size={14} /> },
];

// Search matches any of the given strings, case-insensitively; an empty query matches everything.
const hits = (q, ...fields) => !q || fields.some((f) => String(f || '').toLowerCase().includes(q));

function FixtureRow({ fixture, today, saved, toggleSaved, onOpenRecord, todayRow = false, awaiting = false }) {
  const date = parts(fixture.date);
  return (
    <div className="list-row row-top">
      <button type="button" className="record-row-main" onClick={() => onOpenRecord({ type: 'fixture', id: fixture.id })}>
        <span className="date-block"><b>{date.date}</b><small>{date.month}</small></span>
        <span className="row-text">
          <strong className="with-marks"><MarkPair title={fixture.title} size={14} />{fixture.title}</strong>
          <span>{awaiting ? `Status awaiting confirmation · ${fixture.venue}` : `${todayRow ? 'Today' : relativeDay(fixture.date, today)} · ${fixture.time} · ${fixture.venue}`}</span>
        </span>
        <I.Chevron size={14} />
      </button>
      <SaveButton label={fixture.title} saved={saved.includes(fixture.id)} onToggle={() => toggleSaved(fixture.id)} />
    </div>
  );
}

function Matches({ filter, query, saved, toggleSaved, onOpenRecord }) {
  const { today: TODAY, loadState, liveMatches: allLive, nplFinal: rawFinal, fixtures: allFixtures, results: allResults } = useContent();
  const q = query.trim().toLowerCase();
  const pass = (comp) => filter === 'All' || filter === comp;
  const liveMatches = allLive.filter((m) => hits(q, m.series, m.venue, `${m.batting.name} v ${m.bowling.name}`));
  const nplFinal = rawFinal && hits(q, 'npl final', `${rawFinal.home} v ${rawFinal.away}`, `${rawFinal.away} v ${rawFinal.home}`, rawFinal.venue, rawFinal.result?.summary) ? rawFinal : null;
  const fixtures = allFixtures.filter((f) => hits(q, f.title, f.venue, f.competition));
  const results = allResults.filter((r) => r.date && (q || r.date >= addDays(TODAY, -30)) && hits(q, r.label, r.summary, r.lines.map((l) => l.team).join(' v '), ...r.lines.map((l) => l.team)));
  const live = liveMatches.filter((m) => pass(m.competition || 'Nepal'));
  const finalDone = Boolean(nplFinal?.result);
  const showFinal = Boolean(nplFinal) && !finalDone && nplFinal.date === TODAY && pass('NPL');
  const todayFixtures = fixtures.filter((f) => f.date === TODAY && pass(f.competition) && !isLiveFixture(f, allLive, TODAY));
  const laterToday = todayFixtures.filter((f) => (kickoffUTC(f.date, f.time) ?? Infinity) > Date.now());
  const awaiting = todayFixtures.filter((f) => (kickoffUTC(f.date, f.time) ?? Infinity) <= Date.now());
  const upcoming = fixtures.filter((f) => f.date > TODAY && pass(f.competition));
  const finalResult = finalDone && pass('NPL') ? [{
    id: 'npl-final-result',
    competition: 'NPL',
    label: `NPL Final · ${nplFinal.venue} · ${parts(nplFinal.date).date} ${parts(nplFinal.date).month}`,
    lines: nplFinal.result.lines.map(({ overs, ...l }) => (l.score.startsWith('Chased') ? l : { ...l, overs })),
    summary: nplFinal.result.detail ? `${nplFinal.result.summary} · ${nplFinal.result.detail}` : nplFinal.result.summary,
  }] : [];
  const done = [...finalResult, ...results.filter((r) => pass(r.competition))];
  const nothing = !live.length && !showFinal && !laterToday.length && !awaiting.length && !upcoming.length && !done.length;
  const today = parts(TODAY);

  return (
    <>
      {nothing && <p className="empty" style={{ padding: '24px 20px' }}>{loadState === 'loading' ? 'Checking match data…' : loadState === 'error' ? 'Match data could not refresh. Please try again later.' : q ? `No matches for “${query.trim()}”.` : `Nothing here yet for ${filter}.`}</p>}

      {(live.length > 0 || showFinal || laterToday.length > 0 || awaiting.length > 0) && (
        <>
          <Divider />
          <section className="section">
            <h2 className="group-label">Today · {today.day} {today.date} {today.month}</h2>
            {live.map((m) => (
              <div key={m.id} className="discover-live">
                <p className="discover-live-meta">{m.series}, {m.venue}</p>
                <button type="button" className="live-record-link" onClick={() => onOpenRecord({ type: 'live', id: m.id })} aria-label={`Open live match: ${m.batting.name} v ${m.bowling.name}`}><LiveTiles match={m} /></button>
              </div>
            ))}
            {(showFinal || laterToday.length > 0 || awaiting.length > 0) && <div className="card">
              {laterToday.map((f) => <FixtureRow key={f.id} fixture={f} today={TODAY} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} todayRow />)}
              {awaiting.map((f) => <FixtureRow key={f.id} fixture={f} today={TODAY} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} awaiting />)}
              {showFinal && (
                <div className="list-row row-top">
                  <button type="button" className="record-row-main" onClick={() => onOpenRecord({ type: 'fixture', id: 'npl-final' })}>
                    <span className="row-text"><span>Nepal Premier League · Final</span><strong className="with-marks"><MarkPair title={`${nplFinal.home} v ${nplFinal.away}`} size={14} />{nplFinal.home} v {nplFinal.away}</strong><span>{nplFinal.time} NPT · {nplFinal.venue}</span></span><I.Chevron size={14} />
                  </button>
                  <SaveButton label="NPL final" saved={saved.includes('npl-final')} onToggle={() => toggleSaved('npl-final')} />
                </div>
              )}
            </div>}
          </section>
        </>
      )}

      {upcoming.length > 0 && <><Divider /><section className="section"><h2 className="group-label">Upcoming</h2><div className="card">{upcoming.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} today={TODAY} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} />)}</div></section></>}

      {done.length > 0 && (
        <><Divider /><section className="section"><h2 className="group-label">Recent results</h2>{done.map((result) => (
          <button type="button" key={result.id} className="card result record-open-card" onClick={() => onOpenRecord({ type: 'result', id: result.id })}>
            <span className="row-between"><span className="meta-inline">{result.label}</span>{result.status && <span className="status">{result.status.toUpperCase()}</span>}</span>
            {result.lines.map((line, index) => <span key={line.team} className={`line${index ? ' lose' : ''}`}><span className="with-marks"><TeamMark name={line.team} size={14} slot />{line.team}</span><b>{line.score}{line.overs && <span className="muted" style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 400 }}> ({line.overs})</span>}</b></span>)}
            <span className="summary">{result.summary}</span>
          </button>
        ))}<p className="footnote">All times NPT</p></section></>
      )}
    </>
  );
}

function News({ query, onOpenRecord }) {
  const q = query.trim().toLowerCase();
  const content = useContent();
  const stories = content.stories.filter((s) => hits(q, s.title, s.source));
  const worldNews = content.worldNews.filter((n) => hits(q, n.title, n.blurb, n.source));
  if (!stories.length && !worldNews.length) return <p className="empty" style={{ padding: '24px 20px' }}>{q ? `No verified stories for “${query.trim()}”.` : 'No current, sourced stories are available yet.'}</p>;
  return (
    <section className="section">
      {stories.map((story) => <button type="button" key={story.id} className="card story record-open-card" style={{ flex: 'none' }} onClick={() => onOpenRecord({ type: 'story', id: story.id })}><span className="photo">{story.art ? <img src={`/art/${story.art}.svg`} alt="" /> : null}</span><span className="body"><strong>{story.title}</strong><span>{story.source}</span></span></button>)}
      {worldNews.length > 0 && <div className="card">{worldNews.map((news) => <button type="button" key={news.id} className="news-item record-open-card" onClick={() => onOpenRecord({ type: 'story', id: news.id })}><strong>{news.title}</strong><p>{news.blurb}</p><small>{news.source} · {news.date}</small></button>)}</div>}
    </section>
  );
}

export default function DiscoverScreen({ filter = 'All', view = 'browse', query = '', onStateChange, saved, toggleSaved, prefs, onOpenRecord }) {
  const searching = query.trim().length > 0;
  const openSchedule = ({ filter: nextFilter = 'All', query: nextQuery = '' }) => {
    onStateChange({ filter: nextFilter, query: nextQuery, view: 'matches' });
    window.scrollTo(0, 0);
  };
  const browse = () => {
    onStateChange({ view: 'browse', filter: 'All', query: '' });
    window.scrollTo(0, 0);
  };

  return (
    <main className="discover-screen">
      <header className="screen-head">
        <h1 className="screen-title">Discover</h1>
        <p className="subhead">{view === 'browse' ? 'Competitions, grounds and the teams to follow.' : view === 'matches' ? 'Every match, in Nepal time.' : 'Stories from Nepal and beyond.'}</p>
        <label className="search" style={{ marginTop: 0 }}><I.Search size={14} /><span className="sr-only">Search</span><input type="search" placeholder="Teams, matches, stories" value={query} onChange={(event) => onStateChange({ query: event.target.value })} /></label>
      </header>

      {view === 'browse' && !searching && <DiscoverBrowse saved={saved} toggleSaved={toggleSaved} following={prefs.following} toggleFollow={prefs.toggleFollow} onOpenSchedule={openSchedule} onOpenRecord={onOpenRecord} />}
      {view === 'matches' && <><div className="pill-row" style={{ margin: '14px 0 0', padding: '0 16px 4px' }}><button type="button" className="pill" onClick={browse}><I.Chevron size={13} style={{ transform: 'rotate(180deg)' }} />Browse</button>{FILTERS.map((item) => <button key={item.id} type="button" className="pill" aria-pressed={filter === item.id} onClick={() => onStateChange({ filter: item.id })}>{item.icon}{item.id}</button>)}</div><Matches filter={filter} query={query} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} /></>}
      {view === 'browse' && searching && <><div className="pill-row" style={{ margin: '14px 0 0', padding: '0 16px 4px' }}><button type="button" className="pill" onClick={browse}><I.Chevron size={13} style={{ transform: 'rotate(180deg)' }} />Browse</button></div><Matches filter="All" query={query} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} /><News query={query} onOpenRecord={onOpenRecord} /></>}
      {view === 'news' && <><div className="pill-row" style={{ margin: '14px 0 0', padding: '0 16px 4px' }}><button type="button" className="pill" onClick={browse}><I.Chevron size={13} style={{ transform: 'rotate(180deg)' }} />Browse</button></div><News query={query} onOpenRecord={onOpenRecord} /></>}
    </main>
  );
}
