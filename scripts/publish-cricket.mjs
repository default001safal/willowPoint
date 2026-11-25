#!/usr/bin/env node
// Publish only corroborated editorial records. Live collections are deliberately
// excluded: their freshness cadence and failure semantics are different.
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1];
};
const inputPath = option('--input');
const reviewPath = option('--review');
const dryRun = args.includes('--dry-run');
if (!inputPath || !reviewPath) {
  throw new Error('Usage: node scripts/publish-cricket.mjs --input verified.json --review review.json [--dry-run]');
}

const verified = JSON.parse(readFileSync(inputPath, 'utf8'));
const review = JSON.parse(readFileSync(reviewPath, 'utf8'));
const checkedAt = Date.parse(verified.verifiedAt);
const now = Date.now();
if (!Number.isFinite(checkedAt) || now - checkedAt > 3 * 60 * 60 * 1000 || checkedAt - now > 5 * 60 * 1000) {
  throw new Error('Verified editorial data is missing, stale, or dated in the future.');
}

const collections = ['fixtures', 'events', 'results', 'stories', 'worldNews'];
const records = collections.flatMap((collection) => (verified[collection] || []).map((record) => ({ collection, record })));
if (!records.length || records.some(({ record }) => !record.id)) {
  throw new Error('No valid publishable editorial records; Firestore was not touched.');
}
if (verified.liveMatches?.length) {
  throw new Error('Live matches must be published by the live ingestion path, not the editorial publisher.');
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date(now));
const event = [...(verified.events || [])]
  .filter((item) => item.endDate >= today)
  .sort((a, b) => a.date.localeCompare(b.date))[0];
const counts = Object.fromEntries(collections.map((name) => [name, verified[name]?.length || 0]));
const summary = {
  mode: dryRun ? 'dry-run' : 'publish', verifiedAt: verified.verifiedAt,
  counts, event: event?.id || null,
};
console.log(JSON.stringify(summary, null, 2));
if (dryRun) process.exit(0);

const credential = process.env.FIREBASE_SERVICE_ACCOUNT ||
  (process.env.GOOGLE_APPLICATION_CREDENTIALS ? readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8') : null);
if (!credential) throw new Error('Missing Firebase service-account credential.');
const { cert, initializeApp } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
initializeApp({ credential: cert(JSON.parse(credential)) });
const db = getFirestore();
db.settings({ preferRest: true });

const writes = records.map(({ collection, record }) => {
  const { id, ...fields } = record;
  return { collection, id, fields };
});
if (event) {
  writes.push({
    collection: 'config', id: 'event',
    fields: {
      id: event.id, title: event.title, short: event.short || event.title,
      start: event.date, end: event.endDate, venue: event.venue,
      ...(event.note ? { note: event.note } : {}),
    },
  });
}
writes.push({
  collection: 'config', id: 'editorial',
  fields: {
    checkedAt: new Date(now).toISOString(), verifiedAt: verified.verifiedAt,
    cadenceSeconds: 7200, counts, sourceChecks: review.sourceChecks || [],
  },
});

for (let start = 0; start < writes.length; start += 450) {
  const batch = db.batch();
  for (const write of writes.slice(start, start + 450)) {
    batch.set(db.collection(write.collection).doc(write.id), write.fields, { merge: true });
  }
  await batch.commit();
}
console.log(`Published ${writes.length} verified editorial writes; existing good records were preserved.`);
