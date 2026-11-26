import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCuePrompts,
  competitionFilters,
  currentEvents,
  fixturesForEvent,
  followTopics,
  recentResults,
  selectFeaturedEvent,
  upcomingFixtures,
} from '../src/lib/selectors.js';

const TODAY = '2026-11-24';
const NOW = Date.parse('2026-11-24T10:00:00Z');
const event = (id, start, end, extra = {}) => ({ id, title: `${id} title`, date: start, endDate: end, ...extra });
const fixture = (id, date, extra = {}) => ({ id, title: `${id} match`, date, time: 'Time TBC', ...extra });
const result = (id, date, extra = {}) => ({
  id, date, summary: `${id} summary`, lines: [{ team: 'Alpha' }, { team: 'Beta' }], ...extra,
});

test('only valid, published, unexpired events enter current coverage', () => {
  const events = [
    event('current', '2026-11-20', '2026-11-30'),
    event('expired', '2026-11-01', '2026-11-23', { featurePriority: 100 }),
    event('hidden-until-later', '2026-11-20', '2026-11-30', { showFrom: '2026-11-25' }),
    event('opted-out', '2026-11-20', '2026-11-30', { featured: false }),
    event('backwards', '2026-11-30', '2026-11-20'),
    event('invalid', '2026-02-30', '2026-12-30'),
    event('bad-publication-date', '2026-11-20', '2026-11-30', { showFrom: 'not-a-date' }),
  ];
  assert.deepEqual(currentEvents(events, TODAY).map((item) => item.id), ['current']);
  assert.equal(selectFeaturedEvent(events, [], TODAY).id, 'current');
});

test('running events outrank future events at equal priority, and explicit priority remains generic', () => {
  const running = event('running', '2026-11-20', '2026-11-30');
  const future = event('future', '2026-12-01', '2026-12-08');
  assert.equal(selectFeaturedEvent([future, running], [], TODAY).id, 'running');
  assert.equal(selectFeaturedEvent([running, { ...future, featurePriority: 5 }], [], TODAY).id, 'future');
});

test('event linkage accepts both a canonical event ID and a portable event key', () => {
  const selected = { ...event('canonical-id', '2026-11-20', '2026-11-30'), eventKey: 'portable-key' };
  const records = [
    fixture('by-id', '2026-11-25', { event: 'canonical-id' }),
    fixture('by-key', '2026-11-26', { eventKey: 'portable-key' }),
    fixture('other', '2026-11-27', { event: 'another-event', eventKey: 'another-key' }),
  ];
  assert.deepEqual(fixturesForEvent(selected, records).map((item) => item.id), ['by-id', 'by-key']);
});

test('upcoming fixtures and recent results use real dates and kickoff times', () => {
  const fixtures = [
    fixture('started', TODAY, { time: '09:00 NPT' }),
    fixture('later-today', TODAY, { time: '16:00 NPT' }),
    fixture('tomorrow', '2026-11-25'),
    fixture('yesterday', '2026-11-23'),
    fixture('invalid', '2026-02-30'),
  ];
  assert.deepEqual(upcomingFixtures(fixtures, TODAY, NOW).map((item) => item.id), ['later-today', 'tomorrow']);
  const results = [
    result('today', TODAY), result('window-edge', '2026-10-25'),
    result('too-old', '2026-10-24'), result('future', '2026-11-25'), result('invalid', '2026-02-30'),
  ];
  assert.deepEqual(recentResults(results, TODAY).map((item) => item.id), ['today', 'window-edge']);
});

test('filters and follow topics derive from current records, while recaps retain a completed competition', () => {
  const content = {
    liveMatches: [],
    fixtures: [],
    events: [event('finished-event', '2026-11-01', '2026-11-20', { competition: 'Finished Cup' })],
    results: [result('finished-result', '2026-11-20', { competition: 'Finished Cup' })],
  };
  assert.deepEqual(competitionFilters(content, TODAY), ['Finished Cup']);
  assert.deepEqual(followTopics(content, TODAY), []);
  assert.equal(selectFeaturedEvent(content.events, content.fixtures, TODAY), null);

  const active = {
    ...content,
    fixtures: [fixture('next', '2026-11-28', { competition: 'Future Series' })],
    events: [...content.events, event('active-event', '2026-11-20', '2026-11-30', { competition: 'Active Cup' })],
  };
  assert.deepEqual(competitionFilters(active, TODAY), ['Active Cup', 'Finished Cup', 'Future Series']);
  assert.deepEqual(followTopics(active, TODAY).map((topic) => topic.name), ['Active Cup', 'Future Series']);
});

test('Cue prompts use the actual next Nepal fixture and latest eligible result', () => {
  const prompts = buildCuePrompts({
    today: TODAY,
    liveMatches: [],
    fixtures: [
      fixture('started', TODAY, { time: '09:00 NPT', nepal: true }),
      fixture('world-next', '2026-11-25', { title: 'Gamma v Delta' }),
      fixture('nepal-next', '2026-11-26', { title: 'Nepal v Epsilon', nepal: true }),
    ],
    results: [result('latest-result', '2026-11-23')],
    stories: [],
  }, NOW);
  assert.equal(prompts[0].title, 'Give me a current cricket briefing');
  assert.equal(prompts[1].id, 'fixture-nepal-next');
  assert.match(prompts[1].hint, /Nepal v Epsilon/);
  assert.equal(prompts[2].id, 'result-latest-result');
  assert.match(prompts[2].title, /Alpha v Beta/);
});

test('Cue prompt fallbacks use current stories when no eligible result exists', () => {
  const prompts = buildCuePrompts({
    today: TODAY, liveMatches: [], fixtures: [], results: [result('old', '2026-01-01')],
    stories: [{ id: 'story', title: 'A sourced development' }],
  }, NOW);
  assert.equal(prompts.at(-1).id, 'stories');
});
