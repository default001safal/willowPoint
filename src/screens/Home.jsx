import { useState } from 'react';
import * as I from '../components/Icons.jsx';
import LiveSection from '../components/LiveCard.jsx';
import NextForNepal from '../components/NextForNepal.jsx';
import { Divider, SectionHead, relativeDay } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { StatTile, TileGrid } from '../components/StatTiles.jsx';
import { SearchField, SearchFilters, SearchResults } from '../components/Search.jsx';
import { useWeather, weatherSentence } from '../lib/weather.js';
import { TeamMark } from '../components/TeamMark.jsx';

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
        <TileGrid label={`${r.winner}, NPL champions`}>
          <StatTile
            inverse
            value={margin ? margin[1] : '—'}
            unit={margin ? (margin[2].toLowerCase().startsWith('w') ? 'Wkts' : 'Runs') : null}
            mark={<TeamMark name={r.winner} size={13} />}
            label={`${r.winner.split(' ').pop()} won`}
            badge={r.honour || 'Champions'}
          />
          {star && (
            <StatTile
              value={star[2]}
              unit={star[3] ? 'Not out' : 'Runs'}
              label={star[1]}
              badge={r.starBalls ? `off ${r.starBalls} balls` : 'Top score'}
            />
          )}
        </TileGrid>
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
    <main>
      <header className="topbar">
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
      </header>
      <hr className="divider top" aria-hidden="true" />

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
              <button type="button" className="pill" onClick={() => go('discover')}>
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
        <LiveSection matches={liveMatches} onSeeAll={() => go('discover')} />

        {liveMatches.length > 0 && <Divider />}
        <NextForNepal onSeeAll={() => go('discover', 'Nepal')} />

        {nplFinal && <Divider />}
        <NplFinal onPreview={() => askCue(nplFinal?.result ? 'Recap the NPL final' : 'Set the scene for the NPL final')} />

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
