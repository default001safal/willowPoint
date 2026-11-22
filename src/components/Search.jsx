import { useMemo } from 'react';
import * as I from './Icons.jsx';
import { parts, relativeDay } from './ui.jsx';
import { useContent } from '../lib/content.jsx';

export const SCOPES = ['All', 'Live', 'Fixtures', 'Results', 'News'];
export const COMPETITIONS = ['Any', 'Nepal', 'NPL', 'World'];

const Sliders = (p) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

// Flatten all content into one searchable list.
function useIndex() {
  const c = useContent();
  return useMemo(() => {
    const items = [];
    c.liveMatches.forEach((m) =>
      items.push({
        id: `live-${m.id}`, scope: 'Live', competition: m.competition || 'Nepal',
        title: `${m.batting.name} v ${m.bowling.name}`,
        meta: `${m.series} · ${m.venue} · ${m.batting.runs}/${m.batting.wickets}`,
        text: `${m.series} ${m.venue} ${m.batting.name} ${m.bowling.name}`,
      }),
    );
    if (c.nplFinal) {
      items.push({
        id: 'npl-final', scope: 'Fixtures', competition: 'NPL',
        title: `${c.nplFinal.home} v ${c.nplFinal.away}`,
        meta: `NPL final · ${relativeDay(c.nplFinal.date, c.today)} ${c.nplFinal.time} · ${c.nplFinal.venue}`,
        text: `npl final premier league ${c.nplFinal.home} ${c.nplFinal.away} ${c.nplFinal.venue}`,
      });
    }
    c.fixtures.forEach((f) => {
      const p = parts(f.date);
      items.push({
        id: f.id, scope: 'Fixtures', competition: f.competition,
        title: f.title, meta: `${p.date} ${p.month} · ${f.time} · ${f.venue}`,
        text: `${f.title} ${f.venue} ${f.competition}`,
      });
    });
    c.results.forEach((r) =>
      items.push({
        id: r.id, scope: 'Results', competition: r.competition,
        title: r.lines.map((l) => l.team).join(' v '), meta: `${r.summary} · ${r.label}`,
        text: `${r.label} ${r.summary} ${r.lines.map((l) => l.team).join(' ')}`,
      }),
    );
    c.stories.forEach((s) =>
      items.push({ id: s.id, scope: 'News', competition: 'Nepal', title: s.title, meta: s.source, text: `${s.title} ${s.source}`, href: '#' }),
    );
    c.worldNews.forEach((n) =>
      items.push({ id: n.id, scope: 'News', competition: 'World', title: n.title, meta: `${n.source} · ${n.date}`, text: `${n.title} ${n.blurb} ${n.source}`, href: '#' }),
    );
    return items;
  }, [c]);
}

export function SearchField({ query, setQuery, filtersOpen, setFiltersOpen, activeFilters }) {
  return (
    <div className="search">
      <I.Search size={18} />
      <label className="sr-only" htmlFor="home-search">Search</label>
      <input
        id="home-search"
        type="search"
        placeholder="Search Nepal cricket"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      <button
        type="button"
        className="search-filter"
        aria-label={filtersOpen ? 'Hide search filters' : 'Show search filters'}
        aria-expanded={filtersOpen}
        aria-controls="search-filters"
        onClick={() => setFiltersOpen((o) => !o)}
      >
        <Sliders />
        {activeFilters > 0 && <span className="filter-count">{activeFilters}</span>}
      </button>
    </div>
  );
}

export function SearchFilters({ scope, setScope, competition, setCompetition }) {
  return (
    <div id="search-filters" className="filters">
      <div className="pill-row" role="group" aria-label="Type">
        {SCOPES.map((s) => (
          <button key={s} type="button" className="pill" aria-pressed={scope === s} onClick={() => setScope(s)}>{s}</button>
        ))}
      </div>
      <div className="pill-row" role="group" aria-label="Competition">
        {COMPETITIONS.map((c) => (
          <button key={c} type="button" className="pill" aria-pressed={competition === c} onClick={() => setCompetition(c)}>
            {c === 'Any' ? 'Any competition' : c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SearchResults({ query, scope, competition, onClear }) {
  const index = useIndex();
  const q = query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const hits = index.filter(
    (it) =>
      (scope === 'All' || it.scope === scope) &&
      (competition === 'Any' || it.competition === competition) &&
      words.every((w) => it.text.toLowerCase().includes(w) || it.title.toLowerCase().includes(w)),
  );

  return (
    <section className="section" aria-live="polite">
      <div className="section-head" style={{ minHeight: 0 }}>
        <span className="meta-inline">
          {hits.length} {hits.length === 1 ? 'result' : 'results'}
          {q && <> for “{query.trim()}”</>}
        </span>
        <button type="button" className="section-link" onClick={onClear}>Clear</button>
      </div>
      {hits.length === 0 ? (
        <div className="card"><p className="empty">Nothing matches. Try a team, a venue or a competition.</p></div>
      ) : (
        <div className="card">
          {hits.map((h) => {
            const Row = h.href ? 'a' : 'div';
            return (
              <Row key={h.id} href={h.href} className="list-row search-hit">
                <div className="row-text">
                  <strong>{h.title}</strong>
                  <span>{h.meta}</span>
                </div>
                <span className={`chip${h.scope === 'Live' ? ' live' : ''}`}>{h.scope}</span>
              </Row>
            );
          })}
        </div>
      )}
    </section>
  );
}
