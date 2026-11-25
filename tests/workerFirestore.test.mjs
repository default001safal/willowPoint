import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify as verifySignature } from 'node:crypto';
import { commitOperations, firestoreValue, listLiveMatchIds } from '../workers/live-ingest/src/firestore.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const env = {
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
    project_id: 'willowpoint-test', client_email: 'ingest@example.test',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  }),
};

test('Worker signs Google OAuth JWTs and serializes Firestore REST writes', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url) === 'https://oauth2.googleapis.com/token') {
      const body = new URLSearchParams(options.body);
      const jwt = body.get('assertion');
      const [header, claims, signature] = jwt.split('.');
      assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'RS256');
      const payload = JSON.parse(Buffer.from(claims, 'base64url'));
      assert.equal(payload.iss, 'ingest@example.test');
      assert.equal(payload.aud, 'https://oauth2.googleapis.com/token');
      assert.equal(payload.scope, 'https://www.googleapis.com/auth/datastore');
      assert.equal(payload.exp - payload.iat, 3600);
      assert.ok(verifySignature('sha256', Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, 'base64url')));
      return new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 });
    }
    if (String(url).includes('/liveMatches?')) {
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      return new Response(JSON.stringify({ documents: [{ name: 'projects/willowpoint-test/databases/(default)/documents/liveMatches/old-match' }] }), { status: 200 });
    }
    if (String(url).endsWith('/documents:commit')) return new Response('{}', { status: 200 });
    throw new Error(`Unexpected request: ${url}`);
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  assert.deepEqual(await listLiveMatchIds(env), ['old-match']);
  await commitOperations(env, [
    { type: 'set', collection: 'liveMatches', id: 'nepal-vs-uae', data: { runs: 131, rate: 9.14, live: true, batting: { name: 'Nepal' } } },
    { type: 'delete', collection: 'liveMatches', id: 'old-match' },
  ]);
  const commit = calls.find((call) => call.url.endsWith('/documents:commit'));
  const writes = JSON.parse(commit.options.body).writes;
  assert.equal(writes[0].update.fields.runs.integerValue, '131');
  assert.equal(writes[0].update.fields.rate.doubleValue, 9.14);
  assert.equal(writes[0].update.fields.live.booleanValue, true);
  assert.equal(writes[0].update.fields.batting.mapValue.fields.name.stringValue, 'Nepal');
  assert.match(writes[1].delete, /liveMatches\/old-match$/);
  assert.deepEqual(firestoreValue([null, 'x']), { arrayValue: { values: [{ nullValue: null }, { stringValue: 'x' }] } });
});
