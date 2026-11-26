import { kickoffUTC } from './statcard.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validDate(value) {
  if (!DATE.test(value || '')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function shiftDate(iso, amount) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function resultTitle(result) {
  return result.lines?.map((line) => line.team).filter(Boolean).join(' v ') || result.label || 'Match result';
}

export function eventDates(event) {
  const start = event.start || event.date || '';
  const end = event.end || event.endDate || start;
  return { start, end };
}

export function currentEvents(events = [], today) {
  return events.map((event) => ({ ...event, ...eventDates(event) })).filter((event) => (
    event.id && event.title && validDate(event.start) && validDate(event.end)
    && event.start <= event.end && event.end >= today
    && (!event.showFrom || (validDate(event.showFrom) && event.showFrom <= today)) && event.featured !== false
  ));
}

export function fixturesForEvent(event, fixtures = []) {
  if (!event?.id) return [];
  return fixtures.filter((fixture) => fixture.event === event.id || (event.eventKey && fixture.eventKey === event.eventKey));
}

export function selectFeaturedEvent(events = [], fixtures = [], today) {
  return currentEvents(events, today).sort((a, b) => {
    const priority = (Number(b.featurePriority) || 0) - (Number(a.featurePriority) || 0);
    if (priority) return priority;
    const aCurrent = a.start <= today && a.end >= today;
    const bCurrent = b.start <= today && b.end >= today;
    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
    const aMatches = fixturesForEvent(a, fixtures).length;
    const bMatches = fixturesForEvent(b, fixtures).length;
    if (aMatches !== bMatches) return bMatches - aMatches;
    return a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.id.localeCompare(b.id);
  })[0] || null;
}

export function upcomingFixtures(fixtures = [], today, now = Date.now()) {
  return fixtures
    .filter((fixture) => fixture.id && validDate(fixture.date) && fixture.date >= today && (kickoffUTC(fixture.date, fixture.time) ?? Infinity) > now)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')) || a.id.localeCompare(b.id));
}

export function recentResults(results = [], today, days = 30) {
  return results
    .filter((result) => result.id && validDate(result.date) && result.date <= today && result.date >= shiftDate(today, -days))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export function competitionFilters(content, today) {
  const names = new Set();
  const add = (record) => record.competition && names.add(record.competition);
  (content.liveMatches || []).forEach(add);
  (content.fixtures || []).filter((fixture) => fixture.date >= today).forEach(add);
  recentResults(content.results || [], today).forEach(add);
  currentEvents(content.events || [], today).forEach(add);
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function followTopics(content, today) {
  const topics = new Map();
  const add = (id, name, kind) => {
    if (!name) return;
    const key = id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (key) topics.set(key, topics.get(key) || { id: key, name, kind });
  };
  (content.liveMatches || []).forEach((match) => add(null, match.competition, 'Live coverage'));
  upcomingFixtures(content.fixtures || [], today).forEach((fixture) => add(null, fixture.competition, 'Match coverage'));
  currentEvents(content.events || [], today).forEach((event) => add(null, event.competition || event.title, 'Current or upcoming event'));
  return [...topics.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildCuePrompts(content, now = Date.now()) {
  const prompts = [];
  const upcoming = upcomingFixtures(content.fixtures || [], content.today, now);
  const next = upcoming[0];
  const nextNepal = upcoming.find((fixture) => fixture.nepal === true);
  const recent = recentResults(content.results || [], content.today)[0];
  prompts.push({
    id: 'briefing',
    title: content.liveMatches?.length ? 'Give me the live cricket briefing' : 'Give me a current cricket briefing',
    hint: 'Current scores, recent results, and confirmed fixtures',
  });
  if (nextNepal) prompts.push({ id: `fixture-${nextNepal.id}`, title: 'When do Nepal play next?', hint: `${nextNepal.title} · ${nextNepal.date}` });
  else if (next) prompts.push({ id: `fixture-${next.id}`, title: 'What is the next listed fixture?', hint: `${next.title} · ${next.date}` });
  if (recent) prompts.push({ id: `result-${recent.id}`, title: `Recap ${resultTitle(recent)}`, hint: recent.summary });
  else if (content.stories?.length) prompts.push({ id: 'stories', title: 'What are the latest cricket stories?', hint: 'Current headlines with original sources' });
  return prompts.slice(0, 3);
}
