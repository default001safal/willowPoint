import { useState } from 'react';
import * as I from '../components/Icons.jsx';
import LiveSection from '../components/LiveCard.jsx';
import { Divider, SaveButton, SectionHead, addDays, parts, relativeDay } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { SearchField, SearchFilters, SearchResults } from '../components/Search.jsx';
import { useWeather, weatherSentence } from '../lib/weather.js';
import { TeamMark } from '../components/TeamMark.jsx';

function Fixtures({ saved, toggleSaved, onSeeAll }) {
  const { today: TODAY, fixtures: all } = useContent();
  const fixtures = all
    .filter((f) => f.nepal !== false && f.date > TODAY)
    .sort((a, b) => a.date.localeCompare(b.date));
  const [day, setDay] = useState(null);
  const week = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i + 1));
  const hasMatch = new Set(fixtures.map((f) => f.date));
  const selected = day === 'all' || week.includes(day)
    ? day
    : fixtures.find((f) => week.includes(f.date))?.date ?? week[0];
  const shown = (selected === 'all' ? fixtures : fixtures.filter((f) => f.date === selected)).slice(0, 2);
  const first = parts(week[0]);
  const last = parts(week[6]);
  const firstYear = week[0].slice(0, 4);
  const lastYear = week[6].slice(0, 4);
  const monthLabel = firstYear !== lastYear
    ? `${first.month} ${firstYear} – ${last.month} ${lastYear}`
    : `${first.month}${first.month !== last.month ? ` – ${last.month}` : ''} ${firstYear}`;

  return (
    <section className="section fixtures-bare" aria-label="Nepal's next matches">
      <SectionHead title="Nepal's next matches">
        <button type="button" className="section-link" onClick={onSeeAll}>
          All fixtures <I.ArrowUp size={11} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </SectionHead>
      <div className="fixture-month">
        <span>{monthLabel}</span>
        <button type="button" aria-label="Show all upcoming Nepal matches" aria-pressed={selected === 'all'} onClick={() => setDay('all')}>All</button>
      </div>
      <div className="fixture-week" role="group" aria-label="Choose fixture date">
        {week.map((d) => {
          const p = parts(d);
          return (
            <button key={d} type="button" aria-pressed={selected === d} aria-label={`${p.day} ${p.date} ${p.month}`} onClick={() => setDay(d)}>
              <small>{p.day}</small>
              <b>{p.date}</b>
              <span aria-hidden="true" className={`fixture-match-dot${hasMatch.has(d) ? ' has-match' : ''}`} />
            </button>
          );
        })}
      </div>
      <ul className="fixture-matches" aria-live="polite">
        {shown.length === 0 && <li className="fixture-empty">No Nepal matches on this date.</li>}
        {shown.map((f) => (
          <li className="fixture-match" key={f.id}>
            <div>
              <h3>{f.title}</h3>
              <p>
                {selected === 'all' && <><time dateTime={f.date}>{parts(f.date).date} {parts(f.date).month}</time><span aria-hidden="true">·</span></>}
                <span>{f.time}</span><span aria-hidden="true">·</span><span>{f.venue}</span>
              </p>
            </div>
            <SaveButton label={f.title} saved={saved.includes(f.id)} onToggle={() => toggleSaved(f.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function NplFinal({ onPreview }) {
  const { today: TODAY, nplFinal } = useContent();
  const [remind, setRemind] = useState(false);
  if (!nplFinal) return null;
  return (
    <section className="section">
      <SectionHead title="NPL final">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="round-btn" aria-label={remind ? 'Reminder set' : 'Remind me'} aria-pressed={remind} onClick={() => setRemind((r) => !r)}>
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
          <span className="chip"><span className="today" />{relativeDay(nplFinal.date, TODAY)} {nplFinal.time}</span>
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
        <LiveSection matches={liveMatches} onAskCue={askCue} />

        {liveMatches.length > 0 && <Divider />}
        <Fixtures saved={saved} toggleSaved={toggleSaved} onSeeAll={() => go('discover', 'Nepal')} />

        {nplFinal && <Divider />}
        <NplFinal onPreview={() => askCue('Set the scene for the NPL final')} />

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
