import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNdtv, parseCricbuzz, parseCricbuzzDetail, parseWisden, reconcile } from '../scripts/live-sources.mjs';

const now = Date.parse('2026-11-24T08:00:00Z');
const ndtv = `<div class="sp-scr_wrp vevent"><span class="dtstart">2026-11-24T11:00+05:30</span><span class="dtend">2026-11-24T11:00+05:30</span><span class="location">Kirtipur</span><a class="sp-scr_lnk" href="/cricket/nep-uae"><div class="scr_txt-ony">Nepal T20I</div><div class="scr_inf-wrp"><span class="scr_dt-red">Play In Progress</span></div><div class="scr_tm-wrp"><span class="scr_tm-nm">Nepal</span><span class="scr_tm-run scr_tm-scr-act">131/3 (14.2)</span></div><div class="scr_tm-wrp"><span class="scr_tm-nm">United Arab Emirates</span><span class="scr_tm-run">169/7 (20.0)</span></div><div class="scr-inf_lt">Nepal need 39 runs in 34 balls</div><div class="scr-inf_rt">CRR 9.14</div></a></div>`;
const cb = `<a href="/live-cricket-scores/12/nep-vs-uae" title="Nepal vs United Arab Emirates, 1st T20I - Live ">Nepal v UAE</a>`;
const ws = `<a href="/match/abc"><span>Live</span><div><div><h2>Nepal</h2><span>130-3</span></div><div><h2>United Arab Emirates</h2><span>169-7</span></div></div></a>`;

test('cross-source validation publishes a sourced live score', () => {
  const a = parseNdtv(ndtv); const b = parseCricbuzz(cb); const c = parseWisden(ws);
  const details = new Map([[a[0].key, parseCricbuzzDetail('<meta name="description" content="Follow NEP 131/3 (14.2) vs UAE 169/7 (20) live">')]]);
  const result = reconcile(a, b, c, details, now);
  assert.equal(result.state, 'ok');
  assert.equal(result.matches[0].target, 170);
  assert.equal(result.matches[0].ballsLeft, 34);
  assert.equal(result.matches[0].corroboratedBy.length, 2);
});

test('a lone source cannot create a live score or a healthy no-game heartbeat', () => {
  assert.equal(reconcile(parseNdtv(ndtv), [], [], new Map(), now).state, 'degraded');
});

test('stumps is not treated as live play', () => {
  assert.equal(parseNdtv(ndtv.replace('Play In Progress', 'Day 1 | Stumps')).length, 0);
});

test('a disagreeing third source is never listed as corroboration', () => {
  const a = parseNdtv(ndtv); const b = parseCricbuzz(cb);
  const c = parseWisden(ws.replace('130-3', '102-3'));
  const details = new Map([[a[0].key, parseCricbuzzDetail('<meta name="description" content="NEP 131/3 (14.2) live">')]]);
  const result = reconcile(a, b, c, details, now);
  assert.equal(result.matches[0].corroboratedBy.length, 1);
  assert.equal(result.matches[0].corroboratedBy[0], b[0].url);
});
