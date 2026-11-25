const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DATASTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
let cachedToken = null;

function bytes(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return new TextEncoder().encode(value);
}

function base64url(value) {
  const data = bytes(value);
  let binary = '';
  for (let index = 0; index < data.length; index += 0x8000) {
    binary += String.fromCharCode(...data.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemBytes(pem) {
  const encoded = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function assertion(account) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: DATASTORE_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const key = await crypto.subtle.importKey(
    'pkcs8', pemBytes(account.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, bytes(`${header}.${claims}`));
  return `${header}.${claims}.${base64url(signature)}`;
}

async function accessToken(env, force = false) {
  if (!force && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await assertion(account),
    }),
  });
  if (!response.ok) throw new Error(`Google OAuth failed (${response.status})`);
  const result = await response.json();
  if (!result.access_token) throw new Error('Google OAuth returned no access token');
  cachedToken = { value: result.access_token, expiresAt: Date.now() + Number(result.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

export function firestoreValue(value) {
  if (value == null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])) } };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { stringValue: String(value) };
}

function projectId(env) {
  if (env.FIREBASE_PROJECT_ID) return env.FIREBASE_PROJECT_ID;
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  if (!account.project_id) throw new Error('Firebase project ID is missing');
  return account.project_id;
}

function root(env) {
  return `https://firestore.googleapis.com/v1/projects/${projectId(env)}/databases/(default)/documents`;
}

async function request(env, path, options = {}, retry = true) {
  const response = await fetch(`${root(env)}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${await accessToken(env)}` },
  });
  if (response.status === 401 && retry) {
    await accessToken(env, true);
    return request(env, path, options, false);
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Firestore request failed (${response.status}): ${detail}`);
  }
  return response;
}

export async function listLiveMatchIds(env) {
  const ids = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '300' });
    if (pageToken) query.set('pageToken', pageToken);
    const response = await request(env, `/liveMatches?${query}`);
    const result = await response.json();
    ids.push(...(result.documents || []).map((document) => decodeURIComponent(document.name.split('/').pop())));
    pageToken = result.nextPageToken || '';
  } while (pageToken);
  return ids;
}

export async function commitOperations(env, operations) {
  if (!operations.length) return;
  for (let start = 0; start < operations.length; start += 450) {
    const writes = operations.slice(start, start + 450).map((operation) => {
      const name = `projects/${projectId(env)}/databases/(default)/documents/${operation.collection}/${encodeURIComponent(operation.id)}`;
      if (operation.type === 'delete') return { delete: name };
      if (operation.type !== 'set') throw new Error(`Unsupported Firestore operation: ${operation.type}`);
      return {
        update: {
          name,
          fields: Object.fromEntries(Object.entries(operation.data).map(([key, value]) => [key, firestoreValue(value)])),
        },
      };
    });
    await request(env, ':commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes }),
    });
  }
}
