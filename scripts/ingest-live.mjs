#!/usr/bin/env node
// Public-page ingestion. No score is published unless independent pages confirm
// the same match is live and a second score is compatible. Fail closed on errors.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { load } from 'cheerio';
import { parseNdtv, parseCricbuzz, parseCricbuzzDetail, parseWisden, reconcile } from './live-sources.mjs';

const run = promisify(execFile);
const URLS = {
  ndtv: 'https://sports.ndtv.com/cricket/live-scores',
  cricbuzz: 'https://www.cricbuzz.com/live-cricket-scores/0',
  wisden: 'https://www.wisden.com/live-cricket-scores',
};
const dryRun = process.argv.includes('--dry-run');

async function fetchHtml(url) {
  const { stdout } = await run('curl', ['-fLsS', '--max-time', '18', '--retry', '1', url], { maxBuffer: 8 * 1024 * 1024 });
  return stdout;
}

async function main() {
  const [ndtvHtml, cbHtml, wisdenHtml] = await Promise.all(Object.values(URLS).map(fetchHtml));
  const ndtvCardCount = load(ndtvHtml)('.sp-scr_wrp.vevent').length;
  const cbCardCount = load(cbHtml)('a[title][href^="/live-cricket-scores/"]').length;
  if (ndtvCardCount === 0 || cbCardCount === 0) throw new Error('A source page changed shape; no Firestore records were touched.');
  const ndtv = parseNdtv(ndtvHtml);
  const cricbuzz = parseCricbuzz(cbHtml);
  const wisden = parseWisden(wisdenHtml);
  const details = new Map();
  await Promise.all(ndtv.filter((m) => cricbuzz.some((c) => c.key === m.key)).slice(0, 8).map(async (m) => {
    const url = cricbuzz.find((c) => c.key === m.key)?.url;
    try { details.set(m.key, parseCricbuzzDetail(await fetchHtml(url))); }
    catch { /* Wisden can still corroborate; a missing detail never counts as evidence. */ }
  }));
  const outcome = reconcile(ndtv, cricbuzz, wisden, details);
  console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'publish', state: outcome.state,
    sourceCounts: { ndtv: ndtv.length, cricbuzz: cricbuzz.length, wisden: wisden.length },
    verified: outcome.matches.map((m) => ({ id: m.id, score: `${m.batting.runs}/${m.batting.wickets}`, sources: 1 + m.corroboratedBy.length })) }, null, 2));
  if (outcome.state !== 'ok') throw new Error('Sources disagree or are incomplete; no Firestore records were touched.');
  if (dryRun) return;

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
  batch.set(db.collection('config').doc('feed'), { state: 'ok', checkedAt: new Date().toISOString(), sources: Object.keys(URLS), coverage: 'Nepal and selected internationals' });
  await batch.commit();
  console.log('Verified live feed published.');
}

main().catch((err) => { console.error(`[willowPoint] ${err.message}`); process.exitCode = 1; });
