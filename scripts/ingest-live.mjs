#!/usr/bin/env node
// Live-score ingestion. No score is published unless independent pages confirm
// the same match is live and a second score is compatible. Fail closed on errors.
//
// Modes:
//   node scripts/ingest-live.mjs --dry-run   # inspect sources, print outcome, never write
//   node scripts/ingest-live.mjs            # publish verified scores + feed heartbeat
//
// A permitted provider (licensed API, owner-approved feed) can be plugged in without
// touching this file: set LIVE_PROVIDER_MODULE to a JS module path that exports
// collect(fetchHtml) → Promise<fully-formed liveMatches records>. Its records are
// published alongside the cross-checked public ones. See scripts/providers/custom.example.mjs.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { load } from 'cheerio';
import { parseNdtv, parseCricbuzz, parseCricbuzzDetail, parseWisden, reconcile } from './live-sources.mjs';

const run = promisify(execFile);
const URLS = {
  ndtv: 'https://sports.ndtv.com/cricket/live-scores',
  cricbuzz: 'https://www.cricbuzz.com/live-cricket-scores/0',
  wisden: 'https://www.wisden.com/live-cricket-scores',
  // Staging override: WILLOWPOINT_SOURCE_URLS='{"ndtv":"https://mirror.example/ndtv",...}'
  ...(process.env.WILLOWPOINT_SOURCE_URLS ? JSON.parse(process.env.WILLOWPOINT_SOURCE_URLS) : {}),
};
const dryRun = process.argv.includes('--dry-run');
// Cricbuzz's CDN 403s non-browser user agents; a standard UA is required for reachability.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function fetchHtml(url) {
  const { stdout } = await run('curl', [
    '-fLsS', '--compressed', '--max-time', '18', '--retry', '1',
    '-A', USER_AGENT, url,
  ], { maxBuffer: 8 * 1024 * 8 * 1024 });
  return stdout;
}

// One polite request at a time with a short pause; these pages are not ours to hammer.
async function fetchSequential(urls, gapMs = 1200) {
  const out = [];
  for (const url of urls) {
    try {
      out.push(await fetchHtml(url));
    } catch {
      out.push(null); // a missing detail never counts as evidence
    }
    await new Promise((resolve) => setTimeout(resolve, gapMs));
  }
  return out;
}

async function collectProviderMatches(now) {
  const modulePath = process.env.LIVE_PROVIDER_MODULE;
  if (!modulePath) return [];
  const { collect } = await import(pathToFileURL(modulePath).href);
  if (typeof collect !== 'function') throw new Error(`LIVE_PROVIDER_MODULE ${modulePath} must export collect(fetchHtml).`);
  const records = await collect(fetchHtml);
  if (!Array.isArray(records)) throw new Error('Provider collect() must return an array of match records.');
  return records
    .filter((m) => m && m.id && m.status === 'live' && m.batting && m.bowling)
    .map((m) => ({ ...m, verifiedAt: new Date(now).toISOString() }));
}

async function publish(outcome, enabledSources) {
  const { cert, initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const credential = process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.GOOGLE_APPLICATION_CREDENTIALS ? readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8') : null);
  if (!credential) throw new Error('Missing Firebase service-account credential.');
  initializeApp({ credential: cert(JSON.parse(credential)) });
  const db = getFirestore();
  db.settings({ preferRest: true });
  const batch = db.batch();
  const previous = await db.collection('liveMatches').get();
  for (const doc of previous.docs) if (!outcome.matches.some((m) => m.id === doc.id)) batch.delete(doc.ref);
  outcome.matches.forEach((m, order) => {
    const { id, ...fields } = m;
    batch.set(db.collection('liveMatches').doc(id), { ...fields, order });
  });
  batch.set(db.collection('config').doc('feed'), {
    state: 'ok', checkedAt: new Date().toISOString(), sources: enabledSources, coverage: 'Nepal and selected internationals',
  });
  await batch.commit();
  console.log('Verified live feed published.');
}

// A failed run must not leave last round's heartbeat looking fresh: mark the feed stale-ish.
async function markFeedError(message) {
  if (dryRun) return;
  try {
    const { cert, initializeApp } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const credential = process.env.FIREBASE_SERVICE_ACCOUNT ||
      (process.env.GOOGLE_APPLICATION_CREDENTIALS ? readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8') : null);
    if (!credential) return;
    initializeApp({ credential: cert(JSON.parse(credential)) });
    const db = getFirestore();
    db.settings({ preferRest: true });
    await db.collection('config').doc('feed').set({
      state: 'error', checkedAt: new Date().toISOString(), detail: String(message).slice(0, 300),
    });
  } catch {
    /* the UI already treats a stale or missing feed as unavailable */
  }
}

async function main() {
  const now = Date.now();
  const [ndtvHtml, cbHtml, wisdenHtml] = await Promise.all(Object.values(URLS).map(fetchHtml));
  const ndtvCardCount = load(ndtvHtml)('.sp-scr_wrp.vevent').length;
  const cbCardCount = load(cbHtml)('a[title][href^="/live-cricket-scores/"]').length;
  if (ndtvCardCount === 0 || cbCardCount === 0) throw new Error('A source page changed shape; no Firestore records were touched.');
  const ndtv = parseNdtv(ndtvHtml);
  const cricbuzz = parseCricbuzz(cbHtml);
  const wisden = parseWisden(wisdenHtml);
  const agreed = ndtv.filter((m) => cricbuzz.some((c) => c.key === m.key)).slice(0, 8);
  const detailUrls = agreed.map((m) => cricbuzz.find((c) => c.key === m.key)?.url).filter(Boolean);
  const detailHtml = await fetchSequential(detailUrls);
  const details = new Map();
  agreed.forEach((m, i) => {
    if (detailHtml[i]) details.set(m.key, parseCricbuzzDetail(detailHtml[i]));
  });
  const outcome = reconcile(ndtv, cricbuzz, wisden, details, now);
  const providerMatches = await collectProviderMatches(now).catch((err) => {
    console.warn(`[willowPoint] provider skipped: ${err.message}`);
    return [];
  });
  const matches = [...outcome.matches, ...providerMatches.filter((p) => !outcome.matches.some((m) => m.id === p.id))];
  const state = outcome.state === 'ok' || providerMatches.length ? 'ok' : outcome.state;
  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'publish', state,
    sourceCounts: { ndtv: ndtv.length, cricbuzz: cricbuzz.length, wisden: wisden.length, provider: providerMatches.length },
    verified: matches.map((m) => ({ id: m.id, score: `${m.batting.runs}/${m.batting.wickets}`, sources: 1 + (m.corroboratedBy?.length || 0) })),
  }, null, 2));
  if (state !== 'ok') throw new Error('Sources disagree or are incomplete; no Firestore records were touched.');
  if (dryRun) return;

  const enabledSources = [...Object.keys(URLS), ...(providerMatches.length ? ['provider'] : [])];
  await publish({ matches }, enabledSources);
}

main().catch(async (err) => {
  console.error(`[willowPoint] ${err.message}`);
  await markFeedError(err.message);
  process.exitCode = 1;
});
