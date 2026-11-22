import { useState } from 'react';
import * as I from '../components/Icons.jsx';
import { Divider, SaveButton, parts, relativeDay } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { MarkPair, TeamMark } from '../components/TeamMark.jsx';

const FILTERS = ['All', 'Nepal', 'NPL', 'Nepal Women', 'World'];
const TABS = ['Matches', 'News', 'Events'];

function Matches({ filter, saved, toggleSaved }) {
  const { today: TODAY, liveMatches, nplFinal, fixtures, results } = useContent();
  const pass = (comp) => filter === 'All' || filter === comp;
  const live = liveMatches.filter((m) => pass(m.competition || 'Nepal'));
  const showFinal = Boolean(nplFinal) && nplFinal.date === TODAY && pass('NPL');
  const upcoming = fixtures.filter((f) => f.date > TODAY && pass(f.competition));
  const done = results.filter((r) => pass(r.competition));
  const nothing = !live.length && !showFinal && !upcoming.length && !done.length;
  const today = parts(TODAY);

  return (
    <>
      {nothing && <p className="empty" style={{ padding: '24px 20px' }}>Nothing here yet for {filter}.</p>}

      {(live.length > 0 || showFinal) && (
        <>
        <Divider />
        <section className="section" style={{ paddingTop: 22, gap: 12 }}>
          <h2 className="group-label">Today · {today.day} {today.date} {today.month}</h2>
          <div className="card">
            {live.map((m) => (
              <div key={m.id} className="result">
                <div className="row-between">
                  <span className="meta-inline">{m.series} · {m.venue}</span>
                  <span className="status live">LIVE</span>
                </div>
                <div className="line"><span className="with-marks"><TeamMark name={m.batting.name} size={14} />{m.batting.name}</span><b>{m.batting.runs}/{m.batting.wickets} <span className="muted" style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 400 }}>({m.batting.overs})</span></b></div>
                <div className="line lose"><span className="with-marks"><TeamMark name={m.bowling.name} size={14} />{m.bowling.name}</span><b>{m.bowling.runs}/{m.bowling.wickets} <span className="muted" style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 400 }}>({m.bowling.overs})</span></b></div>
                <span className="summary live">{m.batting.name} need {m.target - m.batting.runs} from {m.ballsLeft} balls</span>
              </div>
            ))}
            {showFinal && (
              <div className={`list-row${live.length ? ' row-top' : ''}`}>
                <div className="row-text">
                  <span>Nepal Premier League · Final</span>
                  <strong className="with-marks"><MarkPair title={`${nplFinal.home} v ${nplFinal.away}`} size={14} />{nplFinal.home} v {nplFinal.away}</strong>
                  <span>{nplFinal.time} NPT · {nplFinal.venue}</span>
                </div>
                <SaveButton label="NPL final" saved={saved.includes('npl-final')} onToggle={() => toggleSaved('npl-final')} />
              </div>
            )}
          </div>
        </section>
        </>
      )}

      {upcoming.length > 0 && (
        <>
        <Divider />
        <section className="section" style={{ paddingTop: 22, gap: 12 }}>
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
        <section className="section" style={{ paddingTop: 22, gap: 12 }}>
          <h2 className="group-label">Recent results</h2>
          {done.map((r) => (
            <article key={r.id} className="card result">
              <div className="row-between">
                <span className="meta-inline">{r.label}</span>
                {r.status && <span className="status">{r.status.toUpperCase()}</span>}
              </div>
              {r.lines.map((l, i) => (
                <div key={l.team} className={`line${i ? ' lose' : ''}`}>
                  <span className="with-marks"><TeamMark name={l.team} size={14} />{l.team}</span>
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

function News() {
  const { stories, worldNews } = useContent();
  return (
    <section className="section" style={{ paddingTop: 22 }}>
      {stories.map((s) => (
        <a key={s.id} href="#" className="card story" style={{ flex: 'none' }}>
          <div className="photo">{s.art ? <img src={`/art/${s.art}.svg`} alt="" /> : null}</div>
          <div className="body"><strong>{s.title}</strong><span>{s.source}</span></div>
        </a>
      ))}
      <div className="card">
        {worldNews.map((n) => (
          <a key={n.id} href="#" className="news-item">
            <strong>{n.title}</strong>
            <p>{n.blurb}</p>
            <small>{n.source} · {n.date}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function DiscoverScreen({ initialFilter = 'All', saved, toggleSaved }) {
  const [tab, setTab] = useState('Matches');
  const [filter, setFilter] = useState(initialFilter);

  return (
    <main>
      <header className="screen-head">
        <h1 className="screen-title">Discover</h1>
        <p className="subhead">Matches, stories and events, all in Nepal time.</p>
        <label className="search" style={{ marginTop: 0 }}>
          <I.Search size={14} />
          <span className="sr-only">Search</span>
          <input type="search" placeholder="Teams, matches, stories" />
        </label>
        <div className="segmented" role="tablist">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </header>

      {tab === 'Matches' && (
        <>
          <div className="pill-row" style={{ margin: '14px 0 0', padding: '0 20px 4px' }}>
            {FILTERS.map((f) => (
              <button key={f} type="button" className="pill" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <Matches filter={filter} saved={saved} toggleSaved={toggleSaved} />
        </>
      )}
      {tab === 'News' && <News />}
      {tab === 'Events' && <p className="empty" style={{ padding: '24px 20px' }}>Events are coming soon.</p>}
    </main>
  );
}
