# willowPoint

A mobile-first, Nepal-first cricket companion built with React, Vite, Firebase Auth, Firestore, and Hosting. The four tabs are Home, Discover, Cue, and Profile.

## Local use

```bash
npm ci
npm run dev
node --test tests/*.test.mjs
npm run build
npm run ingest:live:check  # source check only; never writes Firestore
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

The live ingestion script reads NDTV Sports, Cricbuzz and Wisden public score pages. It publishes a match only when two independent score observations agree; mismatches or parser failures leave Firestore untouched. The Action in `.github/workflows/ingest-live.yml` is scheduled every five minutes **only on the default branch**. Branch dispatches are dry runs. Nothing in this review branch schedules production writes yet. Source layouts, site permissions, and runner delays can change; monitor the Action and test each source before activating it.

To publish manually after reviewing source output, provide a service-account credential through `FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_APPLICATION_CREDENTIALS` and run `node scripts/ingest-live.mjs`. Never commit a key. The Hosting Action deploys the review branch to `polish-review` and `main` to the live channel. Do not merge or push to `main` without the owner's approval.

Cue currently answers a bounded set of questions from the loaded Firestore records. It does not generate free-form answers. Notifications, linked accounts, and automatic fixture/result/story ingestion are not ready. See [AUDIT.md](AUDIT.md) for the tested behavior and launch blockers.
