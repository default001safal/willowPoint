import { useState } from 'react';
import * as I from '../components/Icons.jsx';
import LiveSection from '../components/LiveCard.jsx';
import NextForNepal from '../components/NextForNepal.jsx';
import { Divider, SaveButton, SectionHead, addDays, parts, relativeDay } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { MarkPair } from '../components/TeamMark.jsx';
import { SearchField, SearchFilters, SearchResults } from '../components/Search.jsx';
import { useWeather, weatherSentence } from '../lib/weather.js';
import { TeamMark } from '../components/TeamMark.jsx';

// The next big event: one card, the event on top, Nepal's next games under it.
function EventCard({ event, saved, toggleSaved, onSeeAll }) {
  const { today, fixtures } = useContent();
  const games = fixtures
    .filter((f) => f.event === event.id && f.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 2);
  const s = parts(event.start);
  const e = parts(event.end);
  const range = s.month === e.month ? `${s.date}–${e.date} ${e.month}` : `${s.date} ${s.month} – ${e.date} ${e.month}`;
  return (
    <section className="section">
      <SectionHead title={event.short || event.title}>
        <button type="button" className="section-link" onClick={onSeeAll}>
          All games <I.ArrowUp size={11} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </SectionHead>
      <div className="card champ-rows">
        <div className="list-row">
          <div className="date-block champ-crest"><I.Trophy size={22} /></div>
          <div className="row-text">
            <strong>{event.title}</strong>
            <span>{range} · {event.venue}{event.note ? ` · ${event.note}` : ''}</span>
          </div>
        </div>
        {games.map((f) => {
          const p = parts(f.date);
          return (
            <div className="list-row row-top" key={f.id}>
              <div className="date-block"><b>{p.date}</b><small>{p.month}</small></div>
              <div className="row-text">
                <strong className="with-marks"><MarkPair title={f.title} size={14} />{f.title}</strong>
                <span>{relativeDay(f.date, today)} · {f.time} · {f.venue}</span>
              </div>
              <SaveButton label={f.title} saved={saved.includes(f.id)} onToggle={() => toggleSaved(f.id)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Home's featured slot: NPL champions for a week after the final, then the next big event.
function Featured({ onPreview, saved, toggleSaved, onSeeAll }) {
  const { today, nplFinal, featuredEvent: event } = useContent();
  const champsUntil = nplFinal?.result ? addDays(nplFinal.date, 7) : null;
  if (nplFinal && (!nplFinal.result || today <= champsUntil)) return <NplFinal onPreview={onPreview} />;
  if (event && today >= (event.showFrom || event.start) && today <= event.end) {
    return <EventCard event={event} saved={saved} toggleSaved={toggleSaved} onSeeAll={onSeeAll} />;
  }
  return null;
}

function NplFinal({ onPreview }) {
  const { today: TODAY, nplFinal } = useContent();
  const [remind, setRemind] = useState(false);
  if (!nplFinal) return null;
  const r = nplFinal.result;

  // Once the final is played: two tiles, how they won and who won it for them.
  if (r) {
    const margin = /(\d+)\s*(wkts?|wickets?|runs?)/i.exec(r.margin || r.summary || '');
    const star = /^(.*?)\s+(\d+)(\*?)$/.exec(r.star || '');
    return (
      <section className="section">
        <SectionHead title="NPL champions">
          <button type="button" className="section-link" onClick={onPreview}>
            Recap <I.ArrowUp size={11} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </SectionHead>
        {/* Same rows as Next for Nepal: a block on the left, the story, a mark on the right. */}
        <div className="card champ-rows">
          <div className="list-row">
            <div className="date-block champ-crest"><TeamMark name={r.winner} size={42} /></div>
            <div className="row-text">
              <strong>{r.winner}</strong>
              <span>Beat {r.winner === nplFinal.home ? nplFinal.away : nplFinal.home} by {margin ? `${margin[1]} ${margin[2].toLowerCase().startsWith('w') ? 'wickets' : 'runs'}` : r.summary}</span>
            </div>
            <span className="champ-badge" title={r.honour || 'Champions'}><I.Trophy size={16} /></span>
          </div>
          {star && (
            <div className="list-row row-top">
              <div className="date-block"><b>{star[2]}</b><small>{star[3] ? 'N.O.' : 'Runs'}</small></div>
              <div className="row-text">
                <strong>{r.starName || star[1]}</strong>
                <span>{r.starBalls ? `Off ${r.starBalls} balls in the final` : 'Top score in the final'}</span>
              </div>
              <span className="champ-badge quiet"><I.CricketBat size={16} /></span>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <SectionHead title="NPL final">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="round-btn" aria-label={remind ? 'Reminder set' : 'Remind me'} aria-pressed={remind} onClick={() => setRemind((v) => !v)}>
            <I.Bell size={15} sw={2} />
          </button>
          <button type="button" className="round-btn" aria-label="Preview with Cue" onClick={onPreview}>
            <I.Spark size={15} style={{ color: 'var(--accent)' }} />
          </button>
        </div>
      </SectionHead>
      <article className="card final-card">
        <div className="versus">
          <span className="name"><TeamMark name={nplFinal.home} size={30} />{nplFinal.home}</span>
          <span className="vs">VS</span>
          <span className="name"><TeamMark name={nplFinal.away} size={30} />{nplFinal.away}</span>
        </div>
        <div className="chips">
          <span className="chip">{nplFinal.date === TODAY && <span className="today" />}{relativeDay(nplFinal.date, TODAY)} {nplFinal.time}</span>
          <span className="chip"><I.Pin size={13} />{nplFinal.venue}</span>
          {nplFinal.note && <span className="chip accent"><I.Swap size={13} />{nplFinal.note}</span>}
        </div>
      </article>
    </section>
  );
}

export default function HomeScreen({ saved, toggleSaved, go, askCue }) {
  const { liveMatches, nplFinal, stories, worldNews } = useContent();
  const weather = useWeather();
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scope, setScope] = useState('All');
  const [competition, setCompetition] = useState('Any');
  const activeFilters = (scope !== 'All' ? 1 : 0) + (competition !== 'Any' ? 1 : 0);
  const searching = query.trim().length > 0 || activeFilters > 0;
  const clearSearch = () => {
    setQuery('');
    setScope('All');
    setCompetition('Any');
    setFiltersOpen(false);
  };
  return (
    <main className="home-screen">
      <header className="home-masthead">
        {/* Kirtipur Cricket Stadium · Samir.giri · CC BY-SA 3.0 (Wikimedia Commons). */}
        <img
          className="home-masthead-photo"
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kirtipur_Cricket_Stadium.jpg/960px-Kirtipur_Cricket_Stadium.jpg"
          alt=""
        />
        <div className="topbar home-masthead-bar">
          <img src="/logo-light.png" alt="willowPoint" />
          <div className="icon-row">
            <button type="button" className="icon-btn" aria-label="Notifications">
              <I.Bell size={19} />
              <span className="notif-dot" />
            </button>
            <button type="button" className="icon-btn" aria-label="Open profile" onClick={() => go('profile')}>
              <I.User size={19} />
            </button>
          </div>
        </div>
      </header>

      <section className="greeting">
        <h1>Namaskar, <span className="soft">hajur!</span></h1>
        <p className="subhead" aria-live="polite">{weatherSentence(weather) || '\u00a0'}</p>
        <SearchField
          query={query}
          setQuery={setQuery}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
          activeFilters={activeFilters}
        />
        {filtersOpen ? (
          <SearchFilters scope={scope} setScope={setScope} competition={competition} setCompetition={setCompetition} />
        ) : (
          !searching && (
            <div className="pill-row">
              <button type="button" className="pill" onClick={() => askCue('Give me my quick Nepal briefing')}>
                <I.Spark size={14} style={{ color: 'var(--accent)' }} />Quick brief
              </button>
              <button type="button" className="pill" onClick={() => go('discover', 'Nepal')}>
                <I.Calendar size={14} style={{ color: 'var(--muted)' }} />Nepal next
              </button>
              <button type="button" className="pill" onClick={() => go('discover', 'NPL')}>
                <I.Trophy size={14} style={{ color: 'var(--muted)' }} />NPL
              </button>
              <button type="button" className="pill" onClick={() => go('profile')}>
                <I.Bookmark size={14} style={{ color: 'var(--muted)' }} />Saved
              </button>
            </div>
          )
        )}
      </section>

      {searching ? (
        <SearchResults query={query} scope={scope} competition={competition} onClear={clearSearch} />
      ) : (
        <>
        {liveMatches.length > 0 && <Divider />}
        <LiveSection matches={liveMatches} onSeeAll={() => go('discover', 'All')} />

        {liveMatches.length > 0 && <Divider />}
        <NextForNepal saved={saved} toggleSaved={toggleSaved} onSeeAll={() => go('discover', 'Nepal')} />

        {nplFinal && <Divider />}
        <Featured onPreview={() => askCue(nplFinal?.result ? 'Recap the NPL final' : 'Set the scene for the NPL final')} saved={saved} toggleSaved={toggleSaved} onSeeAll={() => go('discover', 'Nepal')} />

        <Divider />
        <section className="section" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <div style={{ padding: '0 16px' }}>
            <SectionHead title="Featured News">
              <button type="button" className="section-link">More</button>
            </SectionHead>
          </div>
          <div style={{ padding: '0 16px' }}>
            <button type="button" className="ribbon simple" onClick={() => askCue('Give me my quick Nepal briefing')}>
              <span className="lead"><I.Spark size={15} /></span>
              <span className="grow">Cue's quick read. Your Nepal briefing.</span>
              <span className="chev"><I.Chevron size={14} /></span>
            </button>
          </div>
          <div className="carousel">
            {stories.map((s) => (
              <a key={s.id} href="#" className="card story">
                <div className="photo">{s.art ? <img src={`/art/${s.art}.svg`} alt="" /> : null}</div>
                <div className="body">
                  <strong>{s.title}</strong>
                  <span>{s.source}</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <Divider />
        <section className="section">
          <SectionHead title="Around the world">
            <button type="button" className="section-link">More</button>
          </SectionHead>
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
        </>
      )}
    </main>
  );
}
