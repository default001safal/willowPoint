#!/usr/bin/env node
// Upload the content snapshot in src/data.js to Firestore.
//
// Needs an admin credential (never commit it):
//   Firebase console → Project settings → Service accounts → Generate new private key
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
//
// Usage:
//   npm run seed            # upsert docs
//   npm run seed -- --clear # delete existing content docs first, then upload
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import * as data from '../src/data.js';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON first (see the comment at the top of this file).');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
// REST instead of gRPC: works behind proxies and firewalls that block HTTP/2 streams.
db.settings({ preferRest: true });

const collections = {
  liveMatches: data.liveMatches.map((m) => ({ competition: 'Nepal', ...m })),
  fixtures: data.fixtures,
  results: data.results,
  stories: data.stories,
  worldNews: data.worldNews,
};

async function clear(name) {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

const shouldClear = process.argv.includes('--clear');

for (const [name, items] of Object.entries(collections)) {
  if (shouldClear) console.log(`  cleared ${await clear(name)} from ${name}`);
  const batch = db.batch();
  items.forEach(({ id, ...rest }, order) => batch.set(db.collection(name).doc(id), { ...rest, order }));
  await batch.commit();
  console.log(`✓ ${name}: ${items.length}`);
}

await db.collection('config').doc('featured').set(data.nplFinal);
console.log('✓ config/featured (NPL final card)');
console.log(`Done — project ${serviceAccount.project_id}.`);
