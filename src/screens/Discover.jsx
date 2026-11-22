import { useState } from 'react';
import * as I from '../components/Icons.jsx';
import { Divider, SaveButton, parts, relativeDay } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { isLiveFixture } from '../lib/fixtures.js';
import { MarkPair, TeamMark } from '../components/TeamMark.jsx';
import { LiveTiles } from '../components/LiveCard.jsx';

const FILTERS = [
  { id: 'All', icon: <I.Grid size={14} /> },
  { id: 'Nepal', icon: <TeamMark name="Nepal" size={15} /> },
  { id: 'NPL', icon: <I.Trophy size={14} /> },
  { id: 'Nepal Women', icon: <I.Female size={14} /> },
  { id: 'World', icon: <I.Globe size={14} /> },
];
const TABS = ['Matches', 'News', 'Events'];

// Search matches any of the given strings, case-insensitively; an empty query matches everything.
const hits = (q, ...fields) => !q || fields.some((f) => String(f || '').toLowerCase().includes(q));

function Matches({ filter, query, saved, toggleSaved }) {
  const { today: TODAY, liveMatches: allLive, nplFinal: rawFinal, fixtures: allFixtures, results: allResults } = useContent();
  const q = query.trim().toLowerCase();
  const pass = (comp) => filter === 'All' || filter === comp;
  const liveMatches = allLive.filter((m) => hits(q, m.series, m.venue, m.batting.name, m.bowling.name));
  const nplFinal = rawFinal && hits(q, 'npl final', rawFinal.home, rawFinal.away, rawFinal.venue) ? rawFinal : null;
  const fixtures = allFixtures.filter((f) => hits(q, f.title, f.venue, f.competition));
  const results = allResults.filter((r) => hits(q, r.label, r.summary, ...r.lines.map((l) => l.team)));
  const live = liveMatches.filter((m) => pass(m.competition || 'Nepal'));
  const finalDone = Boolean(nplFinal?.result);
  const showFinal = Boolean(nplFinal) && !finalDone && nplFinal.date === TODAY && pass('NPL');
  const laterToday = fixtures.filter((f) => f.date === TODAY && pass(f.competition) && !isLiveFixture(f, allLive, TODAY));
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
  const nothing = !live.length && !showFinal && !laterToday.length && !upcoming.length && !done.length;
  const today = parts(TODAY);

  return (
    <>
      {nothing && <p className="empty" style={{ padding: '24px 20px' }}>{q ? `No matches for “${query.trim()}”.` : `Nothing here yet for ${filter}.`}</p>}

      {(live.length > 0 || showFinal || laterToday.length > 0) && (
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
          {(showFinal || laterToday.length > 0) && <div className="card">

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
            {showFinal && (
              <div className={`list-row${laterToday.length ? ' row-top' : ''}`}>
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
    return <p className="empty" style={{ padding: '24px 20px' }}>No stories for “{query.trim()}”.</p>;
  }
  return (
    <section className="section">
      {stories.map((s) => (
        <a key={s.id} href="#" className="card story" style={{ flex: 'none' }}>
          <div className="photo">{s.art ? <img src={`/art/${s.art}.svg`} alt="" /> : null}</div>
          <div className="body"><strong>{s.title}</strong><span>{s.source}</span></div>
        </a>
      ))}
      {worldNews.length > 0 && <div className="card">
        {worldNews.map((n) => (
          <a key={n.id} href="#" className="news-item">
            <strong>{n.title}</strong>
            <p>{n.blurb}</p>
            <small>{n.source} · {n.date}</small>
          </a>
        ))}
      </div>}
    </section>
  );
}

export default function DiscoverScreen({ initialFilter = 'All', saved, toggleSaved }) {
  const [tab, setTab] = useState('Matches');
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState('');

  return (
    <main>
      <header className="screen-head">
        <h1 className="screen-title">Discover</h1>
        <p className="subhead">Matches, stories and events, all in Nepal time.</p>
        <label className="search" style={{ marginTop: 0 }}>
          <I.Search size={14} />
          <span className="sr-only">Search</span>
          <input type="search" placeholder="Teams, matches, stories" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="segmented" role="tablist">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </header>

      {tab === 'Matches' && (
        <>
          <div className="pill-row" style={{ margin: '14px 0 0', padding: '0 16px 4px' }}>
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
      {tab === 'News' && <News query={query} />}
      {tab === 'Events' && <p className="empty" style={{ padding: '24px 20px' }}>Events are coming soon.</p>}
    </main>
  );
}
