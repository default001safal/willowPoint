import test from 'node:test';
import assert from 'node:assert/strict';
import { collectVerifiedLive } from '../scripts/live-core.mjs';
import { emptyLiveCache, planLiveWrites } from '../workers/live-ingest/src/planner.js';

const now = Date.parse('2026-11-24T08:00:00Z');
const cb = '<a href="/live-cricket-scores/12/nep-vs-uae" title="Nepal vs United Arab Emirates, 1st T20I - Live ">score</a>';
const ws = '<a href="/match/abc"><span>Live</span><div><div><h2>Nepal</h2><span>131-3 (14.2)</span></div><div><h2>United Arab Emirates</h2><span>169-7 (20)</span></div></div></a>';
const detail = '<meta name="description" content="Follow NEP 131/3 (14.2) vs UAE 169/7 (20) live">';
const urls = { ndtv: 'https://test/ndtv', cricbuzz: 'https://test/cb', wisden: 'https://test/ws' };

test('Wisden supplies liveness when NDTV is blocked, with Cricbuzz corroboration', async () => {
  const outcome = await collectVerifiedLive({
    now, urls, detailGapMs: 0,
    fetchHtml: async (url) => {
      if (url === urls.ndtv) throw new Error('403');
      if (url === urls.cricbuzz) return cb;
      if (url === urls.wisden) return ws;
      return detail;
    },
  });
  assert.equal(outcome.state, 'ok');
  assert.equal(outcome.matches[0].source, 'Wisden');
  assert.equal(outcome.matches[0].corroboratedBy.length, 1);
  assert.match(outcome.matches[0].corroboratedBy[0], /cricbuzz/);
});

test('a blocked Cricbuzz page fails closed instead of self-corroborating Wisden', async () => {
  const outcome = await collectVerifiedLive({
    now, urls, detailGapMs: 0,
    fetchHtml: async (url) => {
      if (url === urls.cricbuzz) throw new Error('403');
      if (url === urls.ndtv) throw new Error('403');
      return ws;
    },
  });
  assert.equal(outcome.state, 'degraded');
  assert.deepEqual(outcome.matches, []);
});

test('valid independent pages produce a healthy idle heartbeat when no covered match is live', async () => {
  const finalCb = '<a href="/live-cricket-scores/12/nep-vs-uae" title="Nepal vs United Arab Emirates, 1st T20I - UAE won ">score</a>';
  const idleWs = '<title>Live Cricket Score | Wisden</title><h1>Live Cricket Scores</h1><a href="/match/abc"><span>Completed</span></a>';
  const outcome = await collectVerifiedLive({
    now, urls, detailGapMs: 0,
    fetchHtml: async (url) => {
      if (url === urls.ndtv) throw new Error('403');
      return url === urls.cricbuzz ? finalCb : idleWs;
    },
  });
  assert.equal(outcome.state, 'ok');
  assert.deepEqual(outcome.matches, []);
  assert.deepEqual(outcome.enabledSources, ['cricbuzz', 'wisden']);
});

test('a covered live Cricbuzz candidate cannot become a healthy idle state', async () => {
  const idleWs = '<title>Live Cricket Score | Wisden</title><h1>Live Cricket Scores</h1>';
  const outcome = await collectVerifiedLive({
    now, urls, detailGapMs: 0,
    fetchHtml: async (url) => {
      if (url === urls.ndtv) throw new Error('403');
      return url === urls.cricbuzz ? cb : idleWs;
    },
  });
  assert.equal(outcome.state, 'degraded');
  assert.deepEqual(outcome.matches, []);
});

const match = {
  id: 'nepal-vs-uae', status: 'live', verifiedAt: new Date(now).toISOString(),
  batting: { name: 'Nepal', runs: 131, wickets: 3, overs: '14.2' },
  bowling: { name: 'UAE', runs: 169, wickets: 7, overs: '20.0' },
  source: 'Wisden', sourceUrl: 'https://example.org/match',
};
const outcome = { matches: [match], enabledSources: ['cricbuzz', 'wisden'] };

test('write planning emits an initial score and feed heartbeat', () => {
  const plan = planLiveWrites(outcome, emptyLiveCache(), now);
  assert.deepEqual(plan.operations.map((operation) => operation.type), ['set', 'set']);
  assert.equal(plan.operations[0].data.order, 0);
});

test('unchanged scores wait one minute, changed scores write immediately, disappeared scores delete', () => {
  const initial = planLiveWrites(outcome, emptyLiveCache(), now);
  const unchanged = planLiveWrites({
    ...outcome, matches: [{ ...match, verifiedAt: new Date(now + 15_000).toISOString() }],
  }, initial.cache, now + 15_000);
  assert.equal(unchanged.operations.length, 0);
  const refresh = planLiveWrites(outcome, unchanged.cache, now + 60_000);
  assert.equal(refresh.operations.length, 2);
  const changed = planLiveWrites({
    ...outcome, matches: [{ ...match, batting: { ...match.batting, runs: 132 } }],
  }, refresh.cache, now + 70_000);
  assert.equal(changed.operations.length, 1);
  assert.equal(changed.operations[0].data.batting.runs, 132);
  const removed = planLiveWrites({ ...outcome, matches: [] }, changed.cache, now + 75_000);
  assert.ok(removed.operations.some((operation) => operation.type === 'delete' && operation.id === match.id));
});
