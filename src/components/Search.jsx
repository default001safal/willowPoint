import { useEffect, useMemo, useRef } from 'react';
import * as I from './Icons.jsx';
import { parts } from './ui.jsx';
import { useContent } from '../lib/content.jsx';
import { currentEvents, resultTitle, upcomingFixtures } from '../lib/selectors.js';

export const SCOPES = ['All', 'Live', 'Fixtures', 'Events', 'Results', 'News'];

const Sliders = (props) => (
  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...props}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" />
  </svg>
);

function useIndex() {
  const content = useContent();
  return useMemo(() => {
    const items = [];
    content.liveMatches.forEach((match) => items.push({
      id: `live-${match.id}`, scope: 'Live', competition: match.competition,
      title: `${match.batting.name} v ${match.bowling.name}`,
      meta: `${match.series} · ${match.venue} · ${match.batting.runs}/${match.batting.wickets}`,
      text: `${match.series} ${match.venue} ${match.batting.name} ${match.bowling.name}`,
    }));
    upcomingFixtures(content.fixtures, content.today).forEach((fixture) => {
      const date = parts(fixture.date);
      items.push({
        id: fixture.id, scope: 'Fixtures', competition: fixture.competition,
        title: fixture.title, meta: `${date.date} ${date.month} · ${fixture.time || 'Time TBC'} · ${fixture.venue}`,
        text: `${fixture.title} ${fixture.venue} ${fixture.competition}`,
      });
    });
    currentEvents(content.events, content.today).forEach((event) => items.push({
      id: event.id, scope: 'Events', competition: event.competition,
      title: event.title, meta: `${event.start} – ${event.end} · ${event.venue}`,
      text: `${event.title} ${event.short || ''} ${event.venue} ${event.competition || ''}`,
    }));
    content.results.forEach((result) => items.push({
      id: result.id, scope: 'Results', competition: result.competition,
      title: resultTitle(result), meta: `${result.summary} · ${result.label}`,
      text: `${result.label} ${result.summary} ${(result.lines || []).map((line) => line.team).join(' ')} ${result.competition || ''}`,
    }));
    content.stories.forEach((story) => items.push({
      id: story.id, scope: 'News', competition: story.competition, title: story.title, meta: story.source, text: `${story.title} ${story.source}`,
    }));
    content.worldNews.forEach((story) => items.push({
      id: story.id, scope: 'News', competition: story.competition || 'World', title: story.title, meta: `${story.source} · ${story.date}`, text: `${story.title} ${story.blurb} ${story.source}`,
    }));
    return items;
  }, [content]);
}

export function SearchField({ query, setQuery, filtersOpen, setFiltersOpen, activeFilters }) {
  const inputRef = useRef(null);
  useEffect(() => {
    const shortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  return (
    <div className="search">
      <div className="search-box">
        <I.Search size={17} />
        <label className="sr-only" htmlFor="home-search">Search matches, teams, and stories</label>
        <input ref={inputRef} id="home-search" type="search" placeholder="Search matches, teams, stories…" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
        <button type="button" className="search-filter" aria-label={filtersOpen ? 'Hide search filters' : 'Show search filters'} aria-expanded={filtersOpen} aria-controls="search-filters" onClick={() => setFiltersOpen((open) => !open)}>
          <Sliders />{activeFilters > 0 && <span className="filter-count">{activeFilters}</span>}
        </button>
      </div>
    </div>
  );
}

export function SearchFilters({ scope, setScope, competition, setCompetition }) {
  const { competitions } = useContent();
  return (
    <div id="search-filters" className="filters">
      <div className="pills" role="group" aria-label="Result type">{SCOPES.map((item) => <button key={item} type="button" className={`chip${scope === item ? ' on' : ''}`} aria-pressed={scope === item} onClick={() => setScope(item)}>{item}</button>)}</div>
      <div className="pills" role="group" aria-label="Competition">{['Any', ...competitions].map((item) => <button key={item} type="button" className={`chip${competition === item ? ' on' : ''}`} aria-pressed={competition === item} onClick={() => setCompetition(item)}>{item === 'Any' ? 'Any competition' : item}</button>)}</div>
    </div>
  );
}

export function SearchResults({ query, scope, competition, onClear, onSelect }) {
  const index = useIndex();
  const normalized = query.trim().toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const hits = index.filter((item) =>
    (scope === 'All' || item.scope === scope) &&
    (competition === 'Any' || item.competition === competition) &&
    words.every((word) => item.text.toLowerCase().includes(word) || item.title.toLowerCase().includes(word)),
  );

  return (
    <section className="search-results" aria-live="polite">
      <div className="sec">
        <span className="meta-inline">{hits.length} {hits.length === 1 ? 'result' : 'results'}{normalized && <> for “{query.trim()}”</>}</span>
        <button type="button" className="seclink" onClick={onClear}>Clear</button>
      </div>
      {hits.length === 0 ? <p className="empty-state">Nothing current matches. Try a team, venue, or competition.</p> : (
        <div className="record-list">{hits.map((hit) => (
          <button key={`${hit.scope}-${hit.id}`} type="button" onClick={() => onSelect(hit)} className="search-hit">
            <span className="row-text"><strong>{hit.title}</strong><span>{hit.meta}</span></span>
            <span className={`mini-chip${hit.scope === 'Live' ? ' is-live' : ''}`}>{hit.scope}</span>
            <I.Chevron size={14} />
          </button>
        ))}</div>
      )}
    </section>
  );
}
