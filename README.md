# willowPoint

A mobile-first, Nepal-first cricket companion built with React, Vite, Firebase Auth, Firestore, and Hosting. The four tabs are Home, Discover, Cue, and Profile.

## Local use

```bash
npm ci
npm run dev
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_cricket*.py'
npm run build
npm run ingest:live:check  # source check only; never writes Firestore
```

The public Firebase web configuration is in `src/lib/firebase.js`. Production reads Firestore in real time. Set `VITE_FIREBASE_DISABLED=true` in `.env.local` only for local development with the dated sample snapshot in `src/data.js`; its score is explicitly labeled **Demo score**. It is not the production data path.

## Data contract

| Path | Purpose | Display rule |
| --- | --- | --- |
| `liveMatches/{id}` | Independently verified score | `status: live`, HTTPS `sourceUrl`, `verifiedAt` within eight minutes |
| `config/feed` | Latest completed live check | Fresh `ok` + no matches means no games live; a fresh `error`, missing, or stale feed means unavailable |
| `fixtures/{id}` | Scheduled matches | Upcoming dates in Nepal time |
| `events/{id}` | Tournament records | Public read; service-account writes only |
| `results/{id}` | Completed matches | Dated records; recent list defaults to 30 days |
| `stories/{id}`, `worldNews/{id}` | Match briefs and attributed source links | HTTPS `sourceUrl` and `publishedAt` within seven days |
| `config/featured`, `config/event`, `config/teamLogos` | Featured content, event, marks | Admin-managed |
| `users/{uid}` | Saved IDs and follows | The signed-in or anonymous user's own document, plus device storage |

## Two independent ingestion tracks

### Live scores: Cloudflare Durable Object alarms

`workers/live-ingest` targets a **15-second** collection interval while verified matches are live and backs off to **60 seconds** when idle. The Durable Object's SQLite-backed alarm is the actual scheduler; the one-minute Workers cron is only a watchdog that restores a missing alarm. Alarms do not repeat automatically, so every run schedules the next one. Fifteen seconds is a target, not a guarantee: upstream page delay, networking, retries, and maintenance can add latency.

NDTV is the preferred explicit liveness authority. If it is unreachable, Wisden can supply explicit liveness. Cricbuzz detail pages independently corroborate scores in the Wisden fallback; a source can never corroborate itself. If corroboration or page-shape validation fails, the Worker publishes no new score and marks `config/feed` as `error`.

Writes are deduplicated: changed match facts are written immediately, unchanged match liveness is refreshed once per minute, and `config/feed` is refreshed once per minute or when its state changes. Match documents that disappear from the verified set are deleted. Firestore then delivers successful writes to open clients in real time.

The Worker uses the service-account JSON stored as a Cloudflare secret. WebCrypto signs an RS256 Google OAuth assertion; Firestore access uses REST. There is no Firebase Admin SDK or private key in browser code.

### Fixtures, events, results, and stories: every two hours

`.github/workflows/cricket-collection.yml` runs at minute 23 of every second hour. Match facts still require independent source agreement. Exact RSS headlines may be published as attributed external links with `kind: source-headline`; they are **not** represented as independently corroborated reporting. Article bodies are discarded.

`scripts/publish-cricket.mjs` upserts verified `fixtures`, `events`, `results`, `stories`, and `worldNews`, preserving existing good records after partial source outages. It never writes `liveMatches` or `config/feed`. Production writes require `main`, a verification timestamp within three hours, at least one publishable record, and the `WILLOWPOINT_INGEST_ENABLED` repository secret. Other runs are dry runs.

## Required repository secrets

- `FIREBASE_SERVICE_ACCOUNT_WILLOWPOINT_FF851` (or `FIREBASE_SERVICE_ACCOUNT`): complete Firebase service-account JSON for Hosting, rules, editorial publishing, and the explicitly enabled manual live fallback.
- `WILLOWPOINT_INGEST_ENABLED`: any non-empty value enables production editorial writes on `main` and explicit non-dry manual fallback writes.

Never commit service-account JSON, Cloudflare secrets, Moonshot credentials, or GitHub tokens.

## Deploy the Cloudflare live collector

Use Node.js **22.12+** for current Wrangler. From the repository root:

```bash
npx wrangler login
npx wrangler deploy --config workers/live-ingest/wrangler.jsonc
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT --config workers/live-ingest/wrangler.jsonc
npx wrangler secret put INGEST_ADMIN_TOKEN --config workers/live-ingest/wrangler.jsonc
npx wrangler deploy --config workers/live-ingest/wrangler.jsonc
```

Paste the complete service-account JSON at the first secret prompt. Generate a long random admin token for the second. Start the coordinator and inspect it:

```bash
curl -X POST https://willowpoint-live-ingest.<your-subdomain>.workers.dev/start \
  -H "Authorization: Bearer <your-admin-token>"
curl https://willowpoint-live-ingest.<your-subdomain>.workers.dev/status \
  -H "Authorization: Bearer <your-admin-token>"
curl -X POST https://willowpoint-live-ingest.<your-subdomain>.workers.dev/run \
  -H "Authorization: Bearer <your-admin-token>"
```

`/stop` disables the loop. `/` and `/health` expose only nonsensitive service health; all control endpoints require the bearer token. Actual Cloudflare source reachability, OAuth, and Firestore writes must be verified with `/run` and `/status` before the collector is considered operational.

The former scheduled GitHub live collector is now **manual fallback only**. An NDTV-blocked GitHub runner must not overwrite a healthy Worker heartbeat with an error. For staging or parser work, `WILLOWPOINT_SOURCE_URLS` and `WILLOWPOINT_SOURCE_ORIGINS` provide source overrides. `LIVE_PROVIDER_MODULE` supports an owner-approved provider in the Node fallback without changing the publisher.

Public-source cross-checking keeps publication conservative but is not a licence to republish content. A permitted provider remains the durable option if source terms or availability change.

## Hosting, rules, and Cue

Pushing `main` runs tests and the production build, deploys Firebase Hosting, and then deploys `firestore.rules` with `firebase-tools`. The service-account secret is written only into the runner's temporary directory with mode 600.

Cue calls the deployed Cloudflare proxy and grounds answers in loaded Firestore content. The Moonshot credential must remain in the proxy's server-side secrets and must never return to client code.
