# willowPoint

A mobile-first, Nepal-first cricket companion built with React, Vite, Firebase Auth, Firestore, and Hosting. Home, Discover, Cue, and Profile all render current Firestore records; there is no mock-data or demo-score mode.

## Local verification

```bash
npm ci
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_cricket*.py'
npm run build
npm run dev
```

`npm run ingest:live:check` performs a source inspection without writing Firestore. A failed or degraded source must be reported as such, never treated as a healthy empty feed.

## Production data contract

| Path | Purpose | Client behavior |
| --- | --- | --- |
| `liveMatches/{id}` | Independently corroborated live scores | Freshness and feed state are checked before display |
| `config/feed` | Latest completed live-source check | Fresh `ok` with no matches means no covered game is live; stale, missing, or error states remain unavailable |
| `fixtures/{id}` | Scheduled matches | Actual NPT dates and kickoff times determine upcoming coverage |
| `events/{id}` | Current or upcoming competitions | Dates, publication windows, fixture links, and optional priority determine visibility |
| `results/{id}` | Completed matches | Actual results power recaps and search; recent lists default to 30 days |
| `stories/{id}`, `worldNews/{id}` | Match briefs and attributed source headlines | Only current, dated, sourced records are shown |
| `config/teamLogos` | Team-logo URLs keyed by team name | Optional presentation metadata; no release is needed to add a logo |
| `users/{uid}` | Saved record IDs and followed topic IDs | Restricted to the signed-in or anonymous owner, with device persistence |

`src/lib/selectors.js` is the shared content-prioritization contract. It validates dates, excludes expired events from featured/current coverage, links fixtures by event ID or portable event key, derives competition filters and follow topics from available records, and builds Cue prompts from actual live matches, fixtures, results, and stories. A completed competition can still appear through a qualifying result or recap; it receives no permanent featured position. No tournament or team has a bespoke frontend path.

The public Firebase web configuration is in `src/lib/firebase.js`. Anonymous authentication supports guest use. Google and email/password authentication can link an anonymous account so its follows and saved records remain attached.

## Independent ingestion tracks

### Live scores: Cloudflare Durable Object alarms

`workers/live-ingest` targets a **15-second** interval while verified matches are live and **60 seconds** when idle. The Durable Object alarm is the scheduler; the one-minute Workers cron is only a watchdog. Upstream delays and source verification can add latency, so the target is not a delivery guarantee.

Each candidate requires an explicit liveness authority and independent score corroboration. A source cannot corroborate itself. NDTV is currently degraded; Wisden can supply explicit liveness with Cricbuzz detail-page corroboration. Failed validation or corroboration publishes no new score and records an error state.

Changed match facts are written immediately. Unchanged liveness and `config/feed` are refreshed at most once per minute. Matches absent from the latest verified set are deleted. Firestore realtime listeners deliver successful writes to clients.

The Worker stores the service-account JSON only as a Cloudflare secret. WebCrypto signs the Google OAuth assertion and Firestore is accessed through REST; no private key or provider credential is shipped to the browser.

### Fixtures, events, results, and stories: every two hours

`.github/workflows/cricket-collection.yml` runs at minute 23 of every second hour. Collection is source-driven and applies the same recent-result and current-event windows to every competition. `scripts/cricket_references.json` contains recorded operational source references used as verification evidence, not client-side content fixtures.

Match facts require independent source agreement. Exact RSS headlines can be published as attributed external links with `kind: source-headline`; they are not presented as independently corroborated reporting, and article bodies are discarded.

`scripts/publish-cricket.mjs` writes verified records directly to `fixtures`, `events`, `results`, `stories`, and `worldNews`, preserving existing good records during partial source outages. It never writes `liveMatches` or `config/feed`, and it does not designate a special featured event. Production writes require `main`, a verification timestamp within three hours, at least one publishable record, and `WILLOWPOINT_INGEST_ENABLED`.

## Required repository secrets

- `FIREBASE_SERVICE_ACCOUNT_WILLOWPOINT_FF851` (or `FIREBASE_SERVICE_ACCOUNT`): complete Firebase service-account JSON for Hosting, rules, editorial publishing, and explicitly enabled manual live recovery.
- `WILLOWPOINT_INGEST_ENABLED`: any non-empty value enables production editorial writes on `main` and explicit non-dry recovery writes.

Never commit service-account JSON, Cloudflare secrets, Moonshot credentials, or GitHub tokens.

## Cloudflare live-collector operations

Use Node.js **22.12+** from the repository root:

```bash
npx wrangler login
npx wrangler deploy --config workers/live-ingest/wrangler.jsonc
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT --config workers/live-ingest/wrangler.jsonc
npx wrangler secret put INGEST_ADMIN_TOKEN --config workers/live-ingest/wrangler.jsonc
npx wrangler deploy --config workers/live-ingest/wrangler.jsonc
```

Start and inspect the coordinator with the admin bearer token:

```bash
curl -X POST https://willowpoint-live-ingest.<your-subdomain>.workers.dev/start \
  -H "Authorization: Bearer <your-admin-token>"
curl https://willowpoint-live-ingest.<your-subdomain>.workers.dev/status \
  -H "Authorization: Bearer <your-admin-token>"
curl -X POST https://willowpoint-live-ingest.<your-subdomain>.workers.dev/run \
  -H "Authorization: Bearer <your-admin-token>"
```

`/stop` disables the loop. `/` and `/health` expose nonsensitive health only; control endpoints require the bearer token. Source reachability, OAuth, and Firestore writes must be checked with `/run` and `/status` before the collector is considered operational. A covered-match soak is still required before claiming the active 15-second cadence is proven.

`scripts/ingest-live.mjs` is operator-run disaster recovery, not a scheduled collector. An NDTV-blocked runner must not overwrite a healthy Worker heartbeat. For staging, `WILLOWPOINT_SOURCE_URLS` and `WILLOWPOINT_SOURCE_ORIGINS` provide source overrides; `LIVE_PROVIDER_MODULE` supports an owner-approved provider in the Node recovery path.

## Hosting, rules, and Cue

Pushing `main` runs JavaScript tests and the production build, deploys Firebase Hosting, then deploys `firestore.rules`. The service-account secret exists only in the runner's temporary directory with mode 600.

Cue calls the deployed Cloudflare proxy and grounds answers in the same loaded Firestore records. The Moonshot credential remains in server-side proxy secrets. If the proxy is unavailable, the local fallback answers only from current records and fails closed when coverage is absent.
