import test from 'node:test';
import assert from 'node:assert/strict';
import { overMarkers } from '../src/lib/innings.js';

test('legacy records show over states without invented totals', () => {
  const overs = overMarkers({ overs: '14.2' }, 20, true);
  assert.equal(overs.filter(over => over.state === 'completed').length, 14);
  assert.equal(overs[14].state, 'current');
  assert.equal(overs.filter(over => over.state === 'upcoming').length, 5);
  assert.ok(overs.every(over => over.runs === null));
});
test('finished innings has no current over and uses its own totals', () => {
  const overs = overMarkers({ overs: '20', overRuns: [0, 12] });
  assert.ok(overs.every(over => over.state === 'completed'));
  assert.equal(overs[0].runs, 0);
  assert.equal(overs[1].runs, 12);
});
test('new over starts at a whole-over boundary for the batting team', () => {
  assert.equal(overMarkers({ overs: '14' }, 20, true)[14].state, 'current');
  assert.equal(overMarkers({ overs: '14' }, 20, false)[14].state, 'upcoming');
});
test('future totals are hidden and shortened innings keep their limit', () => {
  const overs = overMarkers({ overs: '1.3', overRuns: [6, 3, 99] }, 5, true);
  assert.equal(overs.length, 5);
  assert.equal(overs[1].runs, 3);
  assert.equal(overs[2].runs, null);
});

test('an innings ending mid-over keeps its final over completed', () => {
  assert.equal(overMarkers({ overs: '18.3', wickets: 10 }, 20, true)[18].state, 'completed');
  assert.equal(overMarkers({ overs: '18.3' }, 20, false)[18].state, 'completed');
});

test('temporary over data agrees with the two displayed innings scores', async () => {
  const { mockOverRuns } = await import('../src/data.js');
  const sample = mockOverRuns['nep-uae-tri'];
  assert.equal(sample.batting.reduce((sum, runs) => sum + runs, 0), 131);
  assert.equal(sample.bowling.reduce((sum, runs) => sum + runs, 0), 169);
});
