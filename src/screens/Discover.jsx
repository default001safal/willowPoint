import { useState } from 'react';
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

function Matches({ filter, query, saved, toggleSaved }) {
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
  // A played final joins the results, newest first.
  const finalResult = finalDone && pass('NPL') ? [{
    id: 'npl-final-result',
    competition: 'NPL',
    label: `NPL Final · ${nplFinal.venue} · ${parts(nplFinal.date).date} ${parts(nplFinal.date).month}`,
    // Overs move to the summary so a long team name and "Chased 156" share one line.
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
              <LiveTiles match={m} />
            </div>
          ))}
          {(showFinal || laterToday.length > 0 || awaiting.length > 0) && <div className="card">

            {laterToday.map((f, i) => (
              <div className={`list-row${i ? ' row-top' : ''}`} key={f.id}>
                <div className="date-block"><b>{parts(f.date).date}</b><small>{parts(f.date).month}</small></div>
                <div className="row-text">
                  <strong className="with-marks"><MarkPair title={f.title} size={14} />{f.title}</strong>
                  <span>Today · {f.time} · {f.venue}</span>
                </div>
                <SaveButton label={f.title} saved={saved.includes(f.id)} onToggle={() => toggleSaved(f.id)} />
              </div>
            ))}
            {awaiting.map((f) => (
              <div className="list-row" key={f.id}>
                <div className="date-block"><b>{parts(f.date).date}</b><small>{parts(f.date).month}</small></div>
                <div className="row-text"><strong className="with-marks"><MarkPair title={f.title} size={14} />{f.title}</strong><span>Status awaiting confirmation · {f.venue}</span></div>
                <SaveButton label={f.title} saved={saved.includes(f.id)} onToggle={() => toggleSaved(f.id)} />
              </div>
            ))}
            {showFinal && (
              <div className={`list-row${laterToday.length || awaiting.length ? ' row-top' : ''}`}>
                <div className="row-text">
                  <span>Nepal Premier League · Final</span>
                  <strong className="with-marks"><MarkPair title={`${nplFinal.home} v ${nplFinal.away}`} size={14} />{nplFinal.home} v {nplFinal.away}</strong>
                  <span>{nplFinal.time} NPT · {nplFinal.venue}</span>
                </div>
                <SaveButton label="NPL final" saved={saved.includes('npl-final')} onToggle={() => toggleSaved('npl-final')} />
              </div>
            )}
          </div>}
        </section>
        </>
      )}

      {upcoming.length > 0 && (
        <>
        <Divider />
        <section className="section">
          <h2 className="group-label">Upcoming</h2>
          <div className="card">
            {upcoming.map((f) => {
              const p = parts(f.date);
              return (
                <div className="list-row" key={f.id}>
                  <div className="date-block"><b>{p.date}</b><small>{p.month}</small></div>
                  <div className="row-text">
                    <strong className="with-marks"><MarkPair title={f.title} size={14} />{f.title}</strong>
                    <span>{relativeDay(f.date, TODAY)} · {f.time} · {f.venue}</span>
                  </div>
                  <SaveButton label={f.title} saved={saved.includes(f.id)} onToggle={() => toggleSaved(f.id)} />
                </div>
              );
            })}
          </div>
        </section>
        </>
      )}

      {done.length > 0 && (
        <>
        <Divider />
        <section className="section">
          <h2 className="group-label">Recent results</h2>
          {done.map((r) => (
            <article key={r.id} className="card result">
              <div className="row-between">
                <span className="meta-inline">{r.label}</span>
                {r.status && <span className="status">{r.status.toUpperCase()}</span>}
              </div>
              {r.lines.map((l, i) => (
                <div key={l.team} className={`line${i ? ' lose' : ''}`}>
                  <span className="with-marks"><TeamMark name={l.team} size={14} slot />{l.team}</span>
                  <b>{l.score}{l.overs && <span className="muted" style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 400 }}> ({l.overs})</span>}</b>
                </div>
              ))}
              <span className="summary">{r.summary}</span>
            </article>
          ))}
          <p className="footnote">All times NPT</p>
        </section>
        </>
      )}
    </>
  );
}

function News({ query }) {
  const q = query.trim().toLowerCase();
  const content = useContent();
  const stories = content.stories.filter((s) => hits(q, s.title, s.source));
  const worldNews = content.worldNews.filter((n) => hits(q, n.title, n.blurb, n.source));
  if (!stories.length && !worldNews.length) {
    return <p className="empty" style={{ padding: '24px 20px' }}>{q ? `No verified stories for “${query.trim()}”.` : 'No current, sourced stories are available yet.'}</p>;
  }
  return (
    <section className="section">
      {stories.map((s) => {
        const Tag = s.sourceUrl ? 'a' : 'article';
        return <Tag key={s.id} href={s.sourceUrl || undefined} target={s.sourceUrl ? '_blank' : undefined} rel={s.sourceUrl ? 'noopener noreferrer' : undefined} className="card story" style={{ flex: 'none' }}>
          <div className="photo">{s.art ? <img src={`/art/${s.art}.svg`} alt="" /> : null}</div>
          <div className="body"><strong>{s.title}</strong><span>{s.source}</span></div>
        </Tag>;
      })}
      {worldNews.length > 0 && <div className="card">
        {worldNews.map((n) => {
          const Tag = n.sourceUrl ? 'a' : 'article';
          return <Tag key={n.id} href={n.sourceUrl || undefined} target={n.sourceUrl ? '_blank' : undefined} rel={n.sourceUrl ? 'noopener noreferrer' : undefined} className="news-item">
            <strong>{n.title}</strong>
            <p>{n.blurb}</p>
            <small>{n.source} · {n.date}</small>
          </Tag>;
        })}
      </div>}
    </section>
  );
}

export default function DiscoverScreen({ initialFilter = 'All', initialView = 'browse', initialQuery = '', saved, toggleSaved, prefs }) {
  const [view, setView] = useState(initialView);
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState(initialQuery);
  const searching = query.trim().length > 0;
  const openSchedule = ({ filter: nextFilter = 'All', query: nextQuery = '' }) => {
    setFilter(nextFilter);
    setQuery(nextQuery);
    setView('matches');
    window.scrollTo(0, 0);
  };
  const browse = () => {
    setView('browse');
    setFilter('All');
    setQuery('');
    window.scrollTo(0, 0);
  };

  return (
    <main className="discover-screen">
      <header className="screen-head">
        <h1 className="screen-title">Discover</h1>
        <p className="subhead">{view === 'browse' ? 'Competitions, grounds and the teams to follow.' : view === 'matches' ? 'Every match, in Nepal time.' : 'Stories from Nepal and beyond.'}</p>
        <label className="search" style={{ marginTop: 0 }}>
          <I.Search size={14} />
          <span className="sr-only">Search</span>
          <input type="search" placeholder="Teams, matches, stories" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </header>

      {view === 'browse' && !searching && <DiscoverBrowse saved={saved} toggleSaved={toggleSaved} following={prefs.following} toggleFollow={prefs.toggleFollow} onOpenSchedule={openSchedule} />}

      {view === 'matches' && (
        <>
          <div className="pill-row" style={{ margin: '14px 0 0', padding: '0 16px 4px' }}>
            <button type="button" className="pill" onClick={browse}><I.Chevron size={13} style={{ transform: 'rotate(180deg)' }} />Browse</button>
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className="pill" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.icon}
                {f.id}
              </button>
            ))}
          </div>
          <Matches filter={filter} query={query} saved={saved} toggleSaved={toggleSaved} />
        </>
      )}
      {view === 'browse' && searching && <>
        <div className="pill-row" style={{ margin: '14px 0 0', padding: '0 16px 4px' }}><button type="button" className="pill" onClick={browse}><I.Chevron size={13} style={{ transform: 'rotate(180deg)' }} />Browse</button></div>
        <Matches filter="All" query={query} saved={saved} toggleSaved={toggleSaved} />
        <News query={query} />
      </>}
      {view === 'news' && <>
        <div className="pill-row" style={{ margin: '14px 0 0', padding: '0 16px 4px' }}><button type="button" className="pill" onClick={browse}><I.Chevron size={13} style={{ transform: 'rotate(180deg)' }} />Browse</button></div>
        <News query={query} />
      </>}
    </main>
  );
}
