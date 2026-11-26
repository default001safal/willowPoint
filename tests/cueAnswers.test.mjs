import test from 'node:test';
import assert from 'node:assert/strict';
import { cueAnswer } from '../src/lib/cueAnswers.js';

const now = Date.parse('2026-11-24T00:00:00Z');
const content = {
  today: '2026-11-24', loadState: 'ready', liveMatches: [], liveState: 'unavailable',
  fixtures: [{ id: 'nepal-italy', date: '2026-12-04', title: 'Nepal v Italy', time: '09:00 NPT', venue: 'Kirtipur', nepal: true, sourceUrl: 'https://www.icc-cricket.com/fixtures-results' }],
  results: [],
};

test('Cue distinguishes unavailable score from a verified no-game state', () => {
  assert.match(cueAnswer('Live score?', content, now).text, /don’t have a verified live score/);
  assert.match(cueAnswer('Live score?', { ...content, liveState: 'none' }, now).text, /No matches are live in the latest feed check/);
});

test('Cue uses the next fixture and its supplied source URL', () => {
  const result = cueAnswer('When do Nepal play next?', content, now);
  assert.match(result.text, /Nepal v Italy is listed for 2026-12-04/);
  assert.equal(result.sources[0].url, 'https://www.icc-cricket.com/fixtures-results');
});

test('Cue does not invent an answer for an unsupported question', () => {
  assert.match(cueAnswer('Who is the best bowler?', content, now).text, /don’t have a verified answer/);
});


test('Cue answers a generic current-event briefing from its actual record and linked fixtures', () => {
  const event = {
    id: 'harbor-cup', eventKey: 'harbor-2026', title: 'Harbor Cup', date: '2026-11-20',
    endDate: '2026-11-30', venue: 'North Ground', source: 'Example organizer',
    sourceUrl: 'https://example.org/harbor-cup',
  };
  const linked = {
    id: 'harbor-fixture', event: 'harbor-cup', title: 'Alpha v Beta', date: '2026-11-28',
    time: 'Time TBC', venue: 'North Ground',
  };
  const result = cueAnswer('Give me a briefing on the Harbor Cup', {
    ...content, events: [event], fixtures: [linked],
  }, now);
  assert.match(result.text, /Harbor Cup runs from 2026-11-20 to 2026-11-30/);
  assert.match(result.text, /links 1 verified fixture/);
  assert.equal(result.sources[0].url, event.sourceUrl);
});

test('Cue recaps any matching verified result without a tournament-specific branch', () => {
  const record = {
    id: 'alpha-beta', date: '2026-11-22', label: 'Example League · 22 Nov 2026',
    competition: 'Example League', summary: 'Alpha won by 5 runs', source: 'Example scorecard',
    sourceUrl: 'https://example.org/alpha-beta', lines: [{ team: 'Alpha' }, { team: 'Beta' }],
  };
  const answer = cueAnswer('Recap Alpha v Beta', { ...content, results: [record] }, now);
  assert.match(answer.text, /Alpha v Beta · 2026-11-22\. Alpha won by 5 runs\./);
  assert.equal(answer.sources[0].url, record.sourceUrl);
});

test('Cue fails closed when a requested result is absent', () => {
  const answer = cueAnswer('Who won the Unknown Trophy?', content, now);
  assert.match(answer.text, /don’t have a verified result matching/);
  assert.deepEqual(answer.sources, []);
});
