#!/usr/bin/env node
// Manual/legacy live-score fallback. Production cadence belongs to the Cloudflare
// Worker. Independent public observations or an approved provider are required.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { collectVerifiedLive, DEFAULT_LIVE_URLS } from './live-core.mjs';

const run = promisify(execFile);
const URLS = {
  ...DEFAULT_LIVE_URLS,
  ...(process.env.WILLOWPOINT_SOURCE_URLS ? JSON.parse(process.env.WILLOWPOINT_SOURCE_URLS) : {}),
};
// Legacy scheduled GitHub runs are inspection-only. Only an explicit manual
// fallback may write; the Cloudflare Worker owns the production heartbeat.
const dryRun = process.argv.includes('--dry-run') || process.env.GITHUB_EVENT_NAME === 'schedule';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function fetchHtml(url) {
  const { stdout } = await run('curl', [
    '-fLsS', '--compressed', '--max-time', '18', '--retry', '1',
    '-A', USER_AGENT, url,
  ], { maxBuffer: 8 * 1024 * 1024 });
  return stdout;
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

function credential() {
  return process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.GOOGLE_APPLICATION_CREDENTIALS ? readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8') : null);
}

async function firestore() {
  const { cert, initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const account = credential();
  if (!account) throw new Error('Missing Firebase service-account credential.');
  initializeApp({ credential: cert(JSON.parse(account)) });
  const db = getFirestore();
  db.settings({ preferRest: true });
  return db;
}

async function publish(outcome, enabledSources) {
  const db = await firestore();
  const batch = db.batch();
  const previous = await db.collection('liveMatches').get();
  for (const doc of previous.docs) if (!outcome.matches.some((m) => m.id === doc.id)) batch.delete(doc.ref);
  outcome.matches.forEach((m, order) => {
    const { id, ...fields } = m;
    batch.set(db.collection('liveMatches').doc(id), { ...fields, order });
  });
  batch.set(db.collection('config').doc('feed'), {
    state: 'ok', checkedAt: new Date().toISOString(), sources: enabledSources,
    coverage: 'Nepal and selected internationals',
  });
  await batch.commit();
  console.log('Verified live feed published.');
}

async function markFeedError(message) {
  if (dryRun) return;
  try {
    const db = await firestore();
    await db.collection('config').doc('feed').set({
      state: 'error', checkedAt: new Date().toISOString(), detail: String(message).slice(0, 300),
    });
  } catch {
    /* A missing/stale heartbeat also fails closed in the client. */
  }
}

async function main() {
  const now = Date.now();
  const outcome = await collectVerifiedLive({ fetchHtml, now, urls: URLS, detailGapMs: 1200 });
  const providerMatches = await collectProviderMatches(now).catch((error) => {
    console.warn(`[willowPoint] provider skipped: ${error.message}`);
    return [];
  });
  const matches = [...outcome.matches, ...providerMatches.filter((p) => !outcome.matches.some((m) => m.id === p.id))];
  const state = outcome.state === 'ok' || providerMatches.length ? 'ok' : outcome.state;
  const enabledSources = [...outcome.enabledSources, ...(providerMatches.length ? ['provider'] : [])];
  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'publish', state,
    sourceCounts: { ...outcome.sourceCounts, provider: providerMatches.length },
    degradedSources: outcome.degradedSources,
    verified: matches.map((m) => ({
      id: m.id, score: `${m.batting.runs}/${m.batting.wickets}`,
      sources: 1 + (m.corroboratedBy?.length || 0),
    })),
  }, null, 2));
  if (state !== 'ok') throw new Error('Sources disagree or are incomplete; no Firestore records were touched.');
  if (!dryRun) await publish({ matches }, enabledSources);
}

main().catch(async (error) => {
  console.error(`[willowPoint] ${error.message}`);
  await markFeedError(error.message);
  process.exitCode = 1;
});
