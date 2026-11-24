# willowPoint

A mobile-first, Nepal-first cricket companion built with React, Vite, Firebase Auth, Firestore, and Hosting. The four tabs are Home, Discover, Cue, and Profile.

## Local use

```bash
npm ci
npm run dev
node --test tests/*.test.mjs
npm run build
npm run ingest:live:check  # live-source check only; never writes Firestore
```

The public Firebase web configuration is in `src/lib/firebase.js`. Production reads Firestore in real time. Set `VITE_FIREBASE_DISABLED=true` in `.env.local` to run the dated sample snapshot from `src/data.js`; the sample score is explicitly labeled **Demo score**.

## Data contract

| Path | Purpose | Display rule |
| --- | --- | --- |
| `liveMatches/{id}` | Verified score | `status: live`, HTTPS `sourceUrl`, `verifiedAt` within eight minutes |
| `config/feed` | Latest completed check | A fresh empty `ok` check means no games live; missing/stale/error means unavailable |
| `fixtures/{id}` | Scheduled matches | Upcoming dates in Nepal time; started fixtures without a verified score await confirmation |
| `results/{id}` | Completed matches | Dated records; recent list defaults to 30 days |
| `stories/{id}`, `worldNews/{id}` | Editorial links | HTTPS `sourceUrl` and `publishedAt` within seven days |
| `config/featured`, `config/event`, `config/teamLogos` | Featured content, event, marks | Admin-managed |
| `users/{uid}` | Saved IDs and follows | Anonymous user's own document, plus device storage |

Automatic live-score ingestion runs from the `Verify live scores` Action (`.github/workflows/ingest-live.yml`), scheduled every five minutes. It reads three public score pages (NDTV Sports, Cricbuzz, Wisden), requires two independent agreeing observations before anything is published, and always writes a `config/feed` heartbeat (a fresh empty `ok` check means "no games live"). Fail-closed: source disagreement, a changed page shape, or a parser error leaves Firestore untouched and marks the feed `error`, so the UI never presents an old score as live.

Two deliberate gates stand between this code and production writes:

1. **Default branch must be `main`.** GitHub only runs scheduled workflows from the default branch.
2. **The `WILLOWPOINT_INGEST_ENABLED` secret must be set** (any value). Until it is, every run is a dry run.

Note: those public sources' terms restrict automated collection. The cross-checker keeps the data honest but is not a licence — the durable fix is a permitted provider, which drops in without code changes: implement `collect()` in a module (see `scripts/providers/custom.example.mjs`) and point `LIVE_PROVIDER_MODULE` at it. Provider records carry their own `source`/`sourceUrl` and pass through the same 8-minute freshness gate. Until a feed writes verified observations, old score documents fail the freshness check and display as unavailable.

For staging or parser work, `WILLOWPOINT_SOURCE_URLS` (JSON map of `ndtv`/`cricbuzz`/`wisden` to alternate URLs) and `WILLOWPOINT_SOURCE_ORIGINS` (JSON map of origins used to resolve match-detail links) let you point the collector at fixtures or mirrors — used by the maintainers to verify the full pipeline offline.

The Hosting Action deploys `main` to the live channel on every push (tests + build first).

Cue currently answers a bounded set of questions from the loaded Firestore records. It does not generate free-form answers. Notifications, linked accounts, and automatic fixture/result/story ingestion are not ready. See [AUDIT.md](AUDIT.md) for the tested behavior and launch blockers.
