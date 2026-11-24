import test from 'node:test';
import assert from 'node:assert/strict';
import { livePresentation } from '../src/lib/liveState.js';

const now = Date.parse('2026-11-24T08:00:00Z');
const match = { status: 'live', sourceUrl: 'https://example.org/match', verifiedAt: new Date(now - 60_000).toISOString() };

test('a sourced, recent live observation is visible', () => {
  assert.deepEqual(livePresentation([match], null, now), { state: 'live', matches: [match] });
});

test('a legacy score with no verification never appears live', () => {
  assert.deepEqual(livePresentation([{ batting: { runs: 131 } }], null, now), { state: 'stale', matches: [] });
});

test('a formerly live score expires even if its document remains in Firestore', () => {
  assert.deepEqual(livePresentation([{ ...match, verifiedAt: new Date(now - 481_000).toISOString() }], null, now), { state: 'stale', matches: [] });
});

test('an empty feed is only a confirmed no-game state with a recent heartbeat', () => {
  assert.equal(livePresentation([], { state: 'ok', checkedAt: new Date(now - 60_000).toISOString() }, now).state, 'none');
  assert.equal(livePresentation([], { state: 'ok', checkedAt: new Date(now - 901_000).toISOString() }, now).state, 'unavailable');
});
