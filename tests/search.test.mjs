import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchIndex,
  buildSearchSuggestions,
  cueEscalationReason,
  DEFAULT_SEARCH,
  searchIsFiltered,
  searchRecords,
} from '../src/lib/search.js';

const content = {
  today: '2026-12-01',
  competitions: ['Harbor Series', 'Continental Cup'],
  liveMatches: [{
    id: 'live-1',
    series: 'Harbor Series',
    venue: 'North Harbor',
    batting: { name: 'Harbor Kings', runs: 121, wickets: 4, overs: '16.2' },
    bowling: { name: 'Northern Stars', runs: 118, wickets: 9, overs: '20' },
  }],
  fixtures: [
    { id: 'fixture-next', title: 'Harbor Kings v Northern Stars', competition: 'Harbor Series', date: '2026-12-04', time: '09:15', venue: 'North Harbor' },
    { id: 'fixture-old', title: 'Old Kings v Old Stars', competition: 'Harbor Series', date: '2026-11-01', time: '09:15', venue: 'Old Ground' },
  ],
  events: [
    { id: 'event-current', title: 'Continental Cup', short: 'Continental', competition: 'Continental Cup', start: '2026-11-28', end: '2026-12-08', venue: 'Central Oval' },
    { id: 'event-ended', title: 'Ended Shield', competition: 'Ended Shield', start: '2026-10-01', end: '2026-10-07', venue: 'Old Oval' },
  ],
  results: [
    { id: 'result-recent', label: '1st T20I', date: '2026-11-30', competition: 'Harbor Series', summary: 'Harbor Kings won by six wickets', lines: [{ team: 'Northern Stars', score: '118/9' }, { team: 'Harbor Kings', score: '121/4' }] },
    { id: 'result-old', label: 'Final', date: '2026-09-30', competition: 'Old Trophy', summary: 'Old Kings won', lines: [{ team: 'Old Kings', score: '150/6' }, { team: 'Old Stars', score: '121' }] },
  ],
  stories: [{ id: 'story-1', title: 'Harbor Kings name unchanged squad', source: 'Harbor Herald', competition: 'Harbor Series' }],
  worldNews: [{ id: 'world-1', title: 'Continental Cup expands player pool', source: 'World Cricket Desk', competition: 'Continental Cup', blurb: 'New teams join the current event.' }],
};

test('current search excludes archived records until the archive window is requested', () => {
  const index = buildSearchIndex(content);
  const currentIds = searchRecords(index, DEFAULT_SEARCH).map((hit) => hit.id);
  assert.ok(currentIds.includes('fixture-next'));
  assert.ok(!currentIds.includes('fixture-old'));
  assert.ok(!currentIds.includes('event-ended'));
  assert.ok(!currentIds.includes('result-old'));

  const archiveIds = searchRecords(index, { ...DEFAULT_SEARCH, query: 'Old', window: 'all' }).map((hit) => hit.id);
  assert.deepEqual(archiveIds, ['fixture-old', 'event-ended', 'result-old']);
});

test('search indexes only records with enough identity and date metadata', () => {
  const index = buildSearchIndex({
    ...content,
    fixtures: [...content.fixtures, { id: 'fixture-invalid', title: 'Invalid Fixture', competition: 'Invalid Cup' }],
    events: [...content.events, { id: 'event-invalid', title: 'Invalid Event', competition: 'Invalid Cup', start: 'not-a-date' }],
    results: [...content.results, { id: 'result-invalid', label: 'Invalid Result', competition: 'Invalid Cup', summary: 'No date' }],
  });
  const ids = searchRecords(index, { query: 'Invalid', window: 'all' }).map((hit) => hit.id);
  assert.deepEqual(ids, []);
});

test('unfiltered current search prioritizes live, upcoming, events, results, and stories', () => {
  const index = buildSearchIndex(content);
  const hits = searchRecords(index, DEFAULT_SEARCH);
  assert.equal(hits[0].scope, 'Live');
  assert.equal(hits[1].scope, 'Fixtures');
  assert.equal(hits[2].scope, 'Events');
  assert.equal(hits[3].scope, 'Results');
  assert.equal(hits[4].scope, 'News');
});

test('scope, competition, and word matching are universal filters', () => {
  const index = buildSearchIndex(content);
  const competitionHits = searchRecords(index, { ...DEFAULT_SEARCH, competition: 'Continental Cup' });
  assert.ok(competitionHits.length >= 2);
  assert.ok(competitionHits.every((hit) => hit.competition === 'Continental Cup'));

  const scoped = searchRecords(index, { ...DEFAULT_SEARCH, query: 'Harbor Kings', scope: 'Results' });
  assert.deepEqual(scoped.map((hit) => hit.id), ['result-recent']);

  const words = searchRecords(index, { ...DEFAULT_SEARCH, query: 'Kings Northern' });
  assert.ok(words.some((hit) => hit.id === 'fixture-next'));
  assert.ok(words.some((hit) => hit.id === 'result-recent'));
});

test('suggestions are derived from current records rather than static prompts', () => {
  const suggestions = buildSearchSuggestions(content);
  assert.equal(suggestions[0].reason, 'Live now');
  assert.equal(suggestions[0].label, 'Harbor Kings v Northern Stars');
  assert.ok(!suggestions.some((suggestion) => suggestion.reason === 'Next fixture'), 'duplicate live and next-fixture labels collapse into one suggestion');
  assert.ok(suggestions.some((suggestion) => suggestion.reason === 'Current event' && suggestion.label === 'Continental Cup'));
  assert.ok(suggestions.some((suggestion) => suggestion.reason === 'Latest result' && suggestion.label === 'Northern Stars v Harbor Kings'));
  assert.ok(suggestions.some((suggestion) => suggestion.reason === 'Current competition' && suggestion.label === 'Harbor Series'));

  const noLiveSuggestions = buildSearchSuggestions({ ...content, liveMatches: [] });
  assert.ok(noLiveSuggestions.some((suggestion) => suggestion.reason === 'Next fixture' && suggestion.label === 'Harbor Kings v Northern Stars'));
});

test('Cue escalation is offered for questions and unmatched wording only', () => {
  assert.match(cueEscalationReason('Who has the best strike rate?'), /question/);
  assert.match(cueEscalationReason('Can Harbor Kings still qualify?', 2), /question/);
  assert.match(cueEscalationReason('purple cap holder', 0), /No current record/);
  assert.equal(cueEscalationReason('Harbor Kings', 2), null);
  assert.equal(cueEscalationReason('', 0), null);
});

test('search filtering reports whether refinements are active', () => {
  assert.equal(searchIsFiltered(DEFAULT_SEARCH), false);
  assert.equal(searchIsFiltered({ ...DEFAULT_SEARCH, scope: 'Results' }), true);
  assert.equal(searchIsFiltered({ ...DEFAULT_SEARCH, competition: 'Harbor Series' }), true);
  assert.equal(searchIsFiltered({ ...DEFAULT_SEARCH, window: 'all' }), true);
});
