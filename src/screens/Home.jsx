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
function EventCard({ event, saved, toggleSaved, onSeeAll, onOpenRecord }) {
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
          <button type="button" className="record-row-main" onClick={() => onOpenRecord({ type: 'event', id: event.id })}>
            <span className="date-block champ-crest"><I.Trophy size={22} /></span>
            <span className="row-text"><strong>{event.title}</strong><span>{range} · {event.venue}{event.note ? ` · ${event.note}` : ''}</span></span>
            <I.Chevron size={14} />
          </button>
        </div>
        {games.map((f) => {
          const p = parts(f.date);
          return (
            <div className="list-row row-top" key={f.id}>
              <button type="button" className="record-row-main" onClick={() => onOpenRecord({ type: 'fixture', id: f.id })}>
                <span className="date-block"><b>{p.date}</b><small>{p.month}</small></span>
                <span className="row-text"><strong className="with-marks"><MarkPair title={f.title} size={14} />{f.title}</strong><span>{relativeDay(f.date, today)} · {f.time} · {f.venue}</span></span>
                <I.Chevron size={14} />
              </button>
              <SaveButton label={f.title} saved={saved.includes(f.id)} onToggle={() => toggleSaved(f.id)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Home's featured slot: NPL champions for a week after the final, then the next big event.
function Featured({ onPreview, saved, toggleSaved, onSeeAll, onOpenRecord }) {
  const { today, nplFinal, featuredEvent: event } = useContent();
  const champsUntil = nplFinal?.result ? addDays(nplFinal.date, 7) : null;
  if (nplFinal && (!nplFinal.result || today <= champsUntil)) return <NplFinal onPreview={onPreview} onOpenRecord={onOpenRecord} />;
  if (event && today >= (event.showFrom || event.start) && today <= event.end) {
    return <EventCard event={event} saved={saved} toggleSaved={toggleSaved} onSeeAll={onSeeAll} onOpenRecord={onOpenRecord} />;
  }
  return null;
}

function NplFinal({ onPreview, onOpenRecord }) {
  const { today: TODAY, nplFinal } = useContent();
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
        <button type="button" className="card champ-rows record-open-card" onClick={() => onOpenRecord({ type: 'result', id: 'npl-final-result' })} aria-label="Open NPL final result">
          <span className="list-row">
            <span className="date-block champ-crest"><TeamMark name={r.winner} size={42} /></span>
            <span className="row-text"><strong>{r.winner}</strong><span>Beat {r.winner === nplFinal.home ? nplFinal.away : nplFinal.home} by {margin ? `${margin[1]} ${margin[2].toLowerCase().startsWith('w') ? 'wickets' : 'runs'}` : r.summary}</span></span>
            <span className="champ-badge" title={r.honour || 'Champions'}><I.Trophy size={16} /></span>
          </span>
          {star && <span className="list-row row-top">
            <span className="date-block"><b>{star[2]}</b><small>{star[3] ? 'N.O.' : 'Runs'}</small></span>
            <span className="row-text"><strong>{r.starName || star[1]}</strong><span>{r.starBalls ? `Off ${r.starBalls} balls in the final` : 'Top score in the final'}</span></span>
            <span className="champ-badge quiet"><I.CricketBat size={16} /></span>
          </span>}
        </button>
      </section>
    );
  }

  return (
    <section className="section">
      <SectionHead title="NPL final">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="round-btn" aria-label="Preview with Cue" onClick={onPreview}>
            <I.Spark size={15} style={{ color: 'var(--accent)' }} />
          </button>
        </div>
      </SectionHead>
      <button type="button" className="card final-card record-open-card" onClick={() => onOpenRecord({ type: 'fixture', id: 'npl-final' })}>
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
      </button>
    </section>
  );
}

export default function HomeScreen({ saved, toggleSaved, go, askCue, onOpenSaved, onOpenRecord }) {
  const { liveMatches, liveState, loadState, nplFinal, stories } = useContent();
  const weather = useWeather();
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scope, setScope] = useState('All');
  const [competition, setCompetition] = useState('Any');
  const activeFilters = (scope !== 'All' ? 1 : 0) + (competition !== 'Any' ? 1 : 0);
  const searching = query.trim().length > 0 || activeFilters > 0;
  const openSearchHit = (hit) => {
    const type = hit.scope === 'Live' ? 'live' : hit.scope === 'Fixtures' ? 'fixture' : hit.scope === 'Results' ? 'result' : 'story';
    onOpenRecord({ type, id: hit.id.replace(/^live-/, '') });
  };
  const clearSearch = () => {
    setQuery('');
    setScope('All');
    setCompetition('Any');
    setFiltersOpen(false);
  };
  return (
    <main className="home-screen">
      <header className="topbar">
        <img src="/logo-light.png" alt="willowPoint" />
        <div className="icon-row">
          <button type="button" className="icon-btn" aria-label="Open profile" onClick={() => go('profile')}>
            <I.User size={19} />
          </button>
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
              <button type="button" className="pill" onClick={onOpenSaved}>
                <I.Bookmark size={14} style={{ color: 'var(--muted)' }} />Saved
              </button>
            </div>
          )
        )}
      </section>

      {searching ? (
        <SearchResults query={query} scope={scope} competition={competition} onClear={clearSearch} onSelect={openSearchHit} />
      ) : (
        <>
        <Divider />
        <LiveSection matches={liveMatches} state={liveState} loading={loadState === 'loading'} onSeeAll={() => go('discover', 'All')} onOpenMatch={(match) => onOpenRecord({ type: 'live', id: match.id })} />

        <Divider />
        <NextForNepal saved={saved} toggleSaved={toggleSaved} onSeeAll={() => go('discover', 'Nepal')} onOpenRecord={onOpenRecord} />

        {nplFinal && <Divider />}
        <Featured onPreview={() => askCue(nplFinal?.result ? 'Recap the NPL final' : 'Set the scene for the NPL final')} saved={saved} toggleSaved={toggleSaved} onSeeAll={() => go('discover', 'Nepal')} onOpenRecord={onOpenRecord} />

        {stories.length > 0 && <Divider />}
        {stories.length > 0 && <section className="section home-stories">
          <SectionHead title="Stories">
            <button type="button" className="section-link" onClick={() => go('discover', 'News')}>Explore <I.ArrowUp size={11} style={{ transform: 'rotate(45deg)' }} /></button>
          </SectionHead>
          <button type="button" className="card home-story record-open-card" onClick={() => onOpenRecord({ type: 'story', id: stories[0].id })}>
            <strong>{stories[0].title}</strong>
            <span>{stories[0].source}</span><I.Chevron size={15} />
          </button>
        </section>}
        </>
      )}
    </main>
  );
}
