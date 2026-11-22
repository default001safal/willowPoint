import test from 'node:test';
import assert from 'node:assert/strict';
import { overTone, bestOverIndex, cumulative, kickoffUTC, countdownLabel, clockTime } from '../src/lib/statcard.js';

test('over tones follow the reference card', () => {
  assert.deepEqual([12, 10, 7, 6, 0, null].map(overTone), ['big', 'good', 'good', 'low', 'low', 'none']);
});

test('best over is the highest, latest on ties, ignoring upcoming', () => {
  const m = [{ state: 'completed', runs: 8 }, { state: 'completed', runs: 15 }, { state: 'completed', runs: 15 }, { state: 'upcoming', runs: null }];
  assert.equal(bestOverIndex(m), 2);
  assert.equal(bestOverIndex([{ state: 'upcoming', runs: null }]), -1);
});

test('cumulative totals', () => {
  assert.deepEqual(cumulative([8, 12, 9]), [8, 20, 29]);
  assert.deepEqual(cumulative([]), []);
});

test('kick-off converts NPT to UTC and counts down', () => {
  const ko = kickoffUTC('2026-11-24', '15:45 NPT');
  assert.equal(new Date(ko).toISOString(), '2026-11-24T10:00:00.000Z');
  assert.equal(kickoffUTC('2026-12-04', 'Time TBC'), null);
  assert.equal(countdownLabel(ko - Date.parse('2026-11-22T06:40:00Z')), '2d 03h');
  assert.equal(countdownLabel(5 * 3_600_000 + 7 * 60_000), '5h 07m');
  assert.equal(countdownLabel(30_000), 'Soon');
  assert.equal(clockTime('15:45 NPT'), '15:45');
  assert.equal(clockTime('Time TBC'), null);
});
