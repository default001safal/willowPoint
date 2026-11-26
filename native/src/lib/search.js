import {
  currentEvents,
  eventDates,
  recentResults,
  resultTitle,
  upcomingFixtures,
  validDate,
} from './selectors.js';

export const SEARCH_SCOPES = ['All', 'Live', 'Fixtures', 'Events', 'Results', 'News'];

export const DEFAULT_SEARCH = Object.freeze({
  query: '',
  scope: 'All',
  competition: 'Any',
  window: 'current',
});

const SCOPE_RECORD_TYPE = Object.freeze({
  Live: 'live',
  Fixtures: 'fixture',
  Events: 'event',
  Results: 'result',
  News: 'story',
});

const SCOPE_RANK = Object.freeze({ Live: 0, Fixtures: 1, Events: 2, Results: 3, News: 4 });
const ARCHIVE_SCOPE_RANK = Object.freeze({ Live: 0, Fixtures: 5, Events: 6, Results: 7, News: 4 });

function item({ id, scope, competition, title, text, date = '', archive = false, record }) {
  return {
    key: `${scope}-${id}`,
    id,
    scope,
    competition: competition || null,
    title,
    text: `${title} ${text || ''}`.toLowerCase(),
    date,
    archive,
    record: record || { type: SCOPE_RECORD_TYPE[scope], id },
  };
}

function sortHits(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  const dateCompare = a.date.localeCompare(b.date);
  if (a.scope === 'Fixtures' || a.scope === 'Events') return dateCompare || a.key.localeCompare(b.key);
  if (a.scope === 'Results') return -dateCompare || a.key.localeCompare(b.key);
  return a.key.localeCompare(b.key);
}

export function buildSearchIndex(content) {
  const today = content.today || '';
  const events = currentEvents(content.events || [], today);
  const currentEventIds = new Set(events.map((event) => event.id));
  const upcomingIds = new Set(upcomingFixtures(content.fixtures || [], today).map((fixture) => fixture.id));
  const recentIds = new Set(recentResults(content.results || [], today).map((result) => result.id));

  const records = [];
  (content.liveMatches || []).forEach((match) => {
    if (!match.id) return;
    records.push(item({
      id: match.id,
      scope: 'Live',
      competition: match.competition || match.series,
      title: `${match.batting.name} v ${match.bowling.name}`,
      text: `${match.series} ${match.venue} ${match.batting.name} ${match.bowling.name}`,
    }));
  });

  (content.fixtures || []).forEach((fixture) => {
    if (!fixture.id || !fixture.title || !validDate(fixture.date)) return;
    const archive = !upcomingIds.has(fixture.id);
    records.push(item({
      id: fixture.id,
      scope: 'Fixtures',
      competition: fixture.competition,
      title: fixture.title,
      text: `${fixture.venue || ''} ${fixture.competition || ''}`,
      date: fixture.date || '',
      archive,
    }));
  });

  (content.events || []).forEach((event) => {
    if (!event.id || !event.title) return;
    const dates = eventDates(event);
    if (!validDate(dates.start) || !validDate(dates.end) || dates.start > dates.end) return;
    const archive = !currentEventIds.has(event.id);
    records.push(item({
      id: event.id,
      scope: 'Events',
      competition: event.competition,
      title: event.title,
      text: `${event.short || ''} ${event.venue || ''} ${event.competition || ''}`,
      date: dates.start,
      archive,
    }));
  });

  (content.results || []).forEach((result) => {
    if (!result.id || !validDate(result.date)) return;
    records.push(item({
      id: result.id,
      scope: 'Results',
      competition: result.competition,
      title: resultTitle(result),
      text: `${result.label || ''} ${result.summary || ''} ${(result.lines || []).map((line) => line.team).join(' ')} ${result.competition || ''}`,
      date: result.date || '',
      archive: !recentIds.has(result.id),
    }));
  });

  (content.stories || []).forEach((story) => {
    if (!story.id) return;
    records.push(item({ id: story.id, scope: 'News', competition: story.competition, title: story.title, text: `${story.source || ''} ${story.blurb || ''}` }));
  });
  (content.worldNews || []).forEach((story) => {
    if (!story.id) return;
    records.push(item({ id: story.id, scope: 'News', competition: story.competition || 'World', title: story.title, text: `${story.source || ''} ${story.blurb || ''}` }));
  });

  return records.map((record) => ({
    ...record,
    rank: record.scope === 'Live' ? SCOPE_RANK.Live
      : record.archive ? ARCHIVE_SCOPE_RANK[record.scope]
        : SCOPE_RANK[record.scope],
  }));
}

export function searchRecords(index, filters = DEFAULT_SEARCH) {
  const { query = '', scope = 'All', competition = 'Any', window = 'current' } = filters;
  const words = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const includeArchive = window === 'all';
  const hits = index.filter((record) => {
    if (!includeArchive && record.archive) return false;
    if (scope !== 'All' && record.scope !== scope) return false;
    if (competition !== 'Any' && record.competition !== competition) return false;
    return words.every((word) => record.text.includes(word) || record.title.toLowerCase().includes(word));
  });
  return hits.sort(sortHits);
}

export function searchIsFiltered(filters = DEFAULT_SEARCH) {
  return filters.scope !== 'All' || filters.competition !== 'Any' || filters.window !== 'current';
}

export function buildSearchSuggestions(content, limit = 5) {
  const today = content.today || '';
  const suggestions = [];
  const seen = new Set();
  const add = (suggestion) => {
    const key = suggestion.label.toLowerCase();
    if (!suggestion.label || seen.has(key)) return;
    seen.add(key);
    suggestions.push(suggestion);
  };

  const live = (content.liveMatches || [])[0];
  if (live) add({
    id: `live-${live.id}`,
    reason: 'Live now',
    label: `${live.batting.name} v ${live.bowling.name}`,
    query: `${live.batting.name} ${live.bowling.name}`,
    record: { type: 'live', id: live.id },
  });

  const next = upcomingFixtures(content.fixtures || [], today)[0];
  if (next) add({
    id: `fixture-${next.id}`,
    reason: 'Next fixture',
    label: next.title,
    query: next.title,
    record: { type: 'fixture', id: next.id },
  });

  const event = currentEvents(content.events || [], today)[0];
  if (event) add({
    id: `event-${event.id}`,
    reason: 'Current event',
    label: event.title,
    query: event.title,
    record: { type: 'event', id: event.id },
  });

  const result = recentResults(content.results || [], today)[0];
  if (result) add({
    id: `result-${result.id}`,
    reason: 'Latest result',
    label: resultTitle(result),
    query: resultTitle(result),
    record: { type: 'result', id: result.id },
  });

  (content.competitions || []).slice(0, Math.max(0, limit - suggestions.length)).forEach((competition) => add({
    id: `competition-${competition}`,
    reason: 'Current competition',
    label: competition,
    query: competition,
  }));

  return suggestions.slice(0, limit);
}

const CUE_QUESTION = /\b(who|what|when|where|why|how|which|best|worst|compare|comparison|head\s*-?\s*to\s*-?\s*head|record|stats?|statistics|chance|chances|predict|prediction|qualif(?:y|ication|ied)|scenario|standings|table|rank|ranking|odds|injur(?:y|ies)|weather|squads?|captain|coach)\b|\?$/i;

export function cueEscalationReason(query, hitCount = 0) {
  const text = String(query || '').trim();
  if (text.length < 3) return null;
  if (CUE_QUESTION.test(text)) return 'That looks like a question rather than a record lookup.';
  if (hitCount === 0) return 'No current record matched that wording.';
  return null;
}
