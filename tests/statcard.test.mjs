import test from 'node:test';
import assert from 'node:assert/strict';
import { kickoffUTC, countdownLabel, clockTime } from '../src/lib/statcard.js';

test('kick-off converts NPT to UTC and counts down', () => {
  const ko = kickoffUTC('2026-11-24', '15:45 NPT');
  assert.equal(new Date(ko).toISOString(), '2026-11-24T10:00:00.000Z');
  assert.equal(kickoffUTC('2026-12-04', 'Time TBC'), null);
  assert.equal(countdownLabel(ko - Date.parse('2026-11-22T06:40:00Z')), '2d 03h');
  assert.equal(countdownLabel(5 * 3_600_000 + 7 * 60_000), '5h 07m');
  assert.equal(countdownLabel(30_000), 'Soon');
  assert.equal(countdownLabel(-60_000), 'Now');
  assert.equal(countdownLabel(NaN), null);
  assert.equal(clockTime('15:45 NPT'), '15:45');
  assert.equal(clockTime('Time TBC'), null);
});
