import test from 'node:test';
import assert from 'node:assert/strict';
import { cueAnswer } from '../src/lib/cueAnswers.js';

const now = Date.parse('2026-11-24T00:00:00Z');
const content = {
  today: '2026-11-24', loadState: 'ready', liveMatches: [], liveState: 'unavailable',
  fixtures: [{ date: '2026-12-04', title: 'Nepal v Italy', time: '09:00 NPT', venue: 'Kirtipur', sourceUrl: 'https://www.icc-cricket.com/fixtures-results' }],
  results: [],
};

test('Cue distinguishes unavailable score from a verified no-game state', () => {
  assert.match(cueAnswer('Live score?', content, now).text, /don’t have a verified live score/);
  assert.match(cueAnswer('Live score?', { ...content, liveState: 'none' }, now).text, /No matches are live in the latest feed check/);
});

test('Cue uses the next fixture and its supplied source URL', () => {
  const result = cueAnswer('When do Nepal play next?', content, now);
  assert.match(result.text, /Nepal v Italy on 2026-12-04/);
  assert.equal(result.sources[0].url, 'https://www.icc-cricket.com/fixtures-results');
});

test('Cue does not invent an answer for an unsupported question', () => {
  assert.match(cueAnswer('Who is the best bowler?', content, now).text, /don’t have a verified answer/);
});
