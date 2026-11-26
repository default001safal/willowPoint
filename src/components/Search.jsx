import { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as I from './Icons.jsx';
import { PushLayer, SheetLayer } from './InteractionLayer.jsx';
import { parts } from './ui.jsx';
import CueMark from './CueMark.jsx';
import { useContent } from '../lib/content.jsx';
import { eventDates, resultTitle } from '../lib/selectors.js';
import {
  buildSearchIndex,
  buildSearchSuggestions,
  cueEscalationReason,
  DEFAULT_SEARCH,
  searchIsFiltered,
  searchRecords,
  SEARCH_SCOPES,
} from '../lib/search.js';

function activeFilters(filters) {
  return (filters.scope !== 'All' ? 1 : 0)
    + (filters.competition !== 'Any' ? 1 : 0)
    + (filters.window !== 'current' ? 1 : 0);
}

export function SearchLauncher({ onOpen, label = 'Search matches, teams, stories…' }) {
  return (
    <div className="search">
      <button type="button" className="search-box search-launcher" onClick={onOpen} aria-label="Open search">
        <I.Search size={17} />
        <span className="search-launcher-label">{label}</span>
      </button>
    </div>
  );
}

function hitMeta(hit, content) {
  if (hit.scope === 'Live') {
    const match = content.liveMatches.find((item) => item.id === hit.id);
    return match ? `${match.series || 'Live'} · ${match.venue || 'Venue TBC'} · ${match.batting.runs}/${match.batting.wickets}` : 'Verified live score';
  }
  if (hit.scope === 'Fixtures') {
    const fixture = content.fixtures.find((item) => item.id === hit.id);
    if (!fixture) return 'Fixture record';
    const date = parts(fixture.date);
    return `${date.date} ${date.month} · ${fixture.time || 'Time TBC'} · ${fixture.venue || 'Venue TBC'}`;
  }
  if (hit.scope === 'Events') {
    const event = content.events.find((item) => item.id === hit.id);
    if (!event) return 'Event record';
    const { start, end } = eventDates(event);
    return `${start} – ${end}${event.venue ? ` · ${event.venue}` : ''}`;
  }
  if (hit.scope === 'Results') {
    const result = content.results.find((item) => item.id === hit.id);
    return result ? `${result.label || 'Verified result'} · ${result.summary || resultTitle(result)}` : 'Verified result';
  }
  const story = content.stories.find((item) => item.id === hit.id) || content.worldNews.find((item) => item.id === hit.id);
  return story ? `${story.source || 'Original source'}${story.date ? ` · ${story.date}` : ''}` : 'Current story';
}

function SuggestionList({ suggestions, onOpenRecord, onQuery }) {
  if (!suggestions.length) return null;
  return (
    <section className="search-suggestions" aria-label="Suggestions from current records">
      <div className="sec">
        <span className="label">Suggested from current records</span>
      </div>
      <div className="record-list suggestion-list">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            className="search-hit search-suggestion"
            onClick={() => (suggestion.record ? onOpenRecord(suggestion.record) : onQuery(suggestion.query))}
          >
            <span className="row-text"><small>{suggestion.reason}</small><strong>{suggestion.label}</strong></span>
            <I.Chevron size={14} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function SearchLayer({ search, onSearch, onOpenAssist, onOpenRecord, askCue, onClose }) {
  const content = useContent();
  const inputRef = useRef(null);
  const inputId = useId();
  const index = useMemo(() => buildSearchIndex(content), [content]);
  const hits = useMemo(() => searchRecords(index, search), [index, search]);
  const suggestions = useMemo(() => buildSearchSuggestions(content), [content]);
  const trimmedQuery = search.query.trim();
  const filtered = searchIsFiltered(search);
  const reason = cueEscalationReason(trimmedQuery, hits.length);
  const setSearch = (patch) => onSearch({ ...search, ...patch });

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <PushLayer title="Search" eyebrow="Universal record search" onClose={onClose}>
      <div className="search-layer-content">
        <div className="search search-layer">
          <div className="search-box">
            <I.Search size={17} />
            <label className="sr-only" htmlFor={inputId}>Search current and archived records</label>
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              placeholder="Teams, players, venues, competitions…"
              value={search.query}
              autoComplete="off"
              onChange={(event) => setSearch({ query: event.target.value })}
            />
            <button
              type="button"
              className="search-filter"
              aria-label="Open search refinement"
              aria-haspopup="dialog"
              onClick={() => onOpenAssist(search)}
            >
              <I.Sliders size={17} />{activeFilters(search) > 0 && <span className="filter-count">{activeFilters(search)}</span>}
            </button>
          </div>
        </div>

        <div className="pills search-scope-pills" role="group" aria-label="Result type">
          {SEARCH_SCOPES.map((scope) => (
            <button key={scope} type="button" className={`chip${search.scope === scope ? ' on' : ''}`} aria-pressed={search.scope === scope} onClick={() => setSearch({ scope })}>{scope}</button>
          ))}
        </div>

        {reason && (
          <div className="cue-escalation">
            <div><CueMark size={16} /><span>{reason}</span></div>
            <button type="button" className="layer-secondary-action" onClick={() => askCue(trimmedQuery)}>Ask Cue instead</button>
          </div>
        )}

        {!trimmedQuery && !filtered ? (
          <SuggestionList suggestions={suggestions} onOpenRecord={onOpenRecord} onQuery={(query) => setSearch({ query })} />
        ) : (
          <section className="search-results" aria-live="polite">
            <div className="sec">
              <span className="meta-inline">{hits.length} {hits.length === 1 ? 'record' : 'records'}{trimmedQuery && <> for “{trimmedQuery}”</>}</span>
              {searchIsFiltered(search) && <button type="button" className="seclink" onClick={() => onSearch(DEFAULT_SEARCH)}>Reset</button>}
            </div>
            {hits.length === 0 ? (
              <div className="layer-state search-empty-state">
                <h2>No record matched that search</h2>
                <p>{trimmedQuery ? 'Current records stay exact. Ask Cue when the question needs interpretation, context, or an unusual cross-record answer.' : 'No current records match those refinements.'}</p>
                {trimmedQuery ? (
                  <button type="button" className="layer-primary-link" onClick={() => askCue(trimmedQuery)}><CueMark size={16} />Ask Cue about “{trimmedQuery}”</button>
                ) : (
                  <button
                    type="button"
                    className="layer-secondary-action"
                    onClick={() => setSearch(search.window === 'current' ? { window: 'all' } : DEFAULT_SEARCH)}
                  >
                    {search.window === 'current' ? 'Include archive' : 'Reset search'}
                  </button>
                )}
              </div>
            ) : (
              <div className="record-list">
                {hits.map((hit) => (
                  <button key={hit.key} type="button" onClick={() => onOpenRecord(hit.record)} className="search-hit">
                    <span className="row-text"><strong>{hit.title}</strong><span>{hitMeta(hit, content)}</span></span>
                    <span className={`mini-chip${hit.scope === 'Live' ? ' is-live' : ''}`}>{hit.scope}</span>
                    <I.Chevron size={14} />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </PushLayer>
  );
}

const WINDOWS = [
  { id: 'current', label: 'Current records', hint: 'Live, upcoming, current events, recent results, and stories' },
  { id: 'all', label: 'Include archive', hint: 'Also search expired fixtures, completed events, and older results' },
];

export function SearchAssistLayer({ search, onApply, onClose }) {
  const content = useContent();
  const [draft, setDraft] = useState(() => ({ ...DEFAULT_SEARCH, ...search }));
  const suggestions = useMemo(() => buildSearchSuggestions(content, 3), [content]);
  const setDraftPatch = (patch) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <SheetLayer
      title="Refine search"
      eyebrow="Search assist"
      onClose={onClose}
      footer={(
        <div className="assist-actions">
          <button type="button" className="layer-secondary-action" onClick={() => setDraft(DEFAULT_SEARCH)}>Clear</button>
          <button type="button" className="layer-primary-link" onClick={() => onApply(draft)}>Apply search</button>
        </div>
      )}
    >
      <div className="search-assist-content">
        <div className="assist-section">
          <h2 className="label bright">Result type</h2>
          <div className="pills assist-pills" role="group" aria-label="Result type">
            {SEARCH_SCOPES.map((scope) => <button key={scope} type="button" className={`chip${draft.scope === scope ? ' on' : ''}`} aria-pressed={draft.scope === scope} onClick={() => setDraftPatch({ scope })}>{scope}</button>)}
          </div>
        </div>

        <div className="assist-section">
          <h2 className="label bright">Competition</h2>
          <div className="pills assist-pills" role="group" aria-label="Competition">
            {['Any', ...content.competitions].map((competition) => <button key={competition} type="button" className={`chip${draft.competition === competition ? ' on' : ''}`} aria-pressed={draft.competition === competition} onClick={() => setDraftPatch({ competition })}>{competition === 'Any' ? 'Any competition' : competition}</button>)}
          </div>
        </div>

        <div className="assist-section">
          <h2 className="label bright">Record window</h2>
          <div className="assist-options" role="group" aria-label="Record window">
            {WINDOWS.map((option) => (
              <button key={option.id} type="button" className={`assist-option${draft.window === option.id ? ' on' : ''}`} aria-pressed={draft.window === option.id} onClick={() => setDraftPatch({ window: option.id })}>
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="assist-section">
          <h2 className="label bright">Try a current record</h2>
          <div className="record-list suggestion-list">
            {suggestions.map((suggestion) => (
              <button key={suggestion.id} type="button" className="search-hit search-suggestion" onClick={() => setDraftPatch({ query: suggestion.query, scope: 'All', competition: 'Any' })}>
                <span className="row-text"><small>{suggestion.reason}</small><strong>{suggestion.label}</strong></span>
                <I.Chevron size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </SheetLayer>
  );
}
