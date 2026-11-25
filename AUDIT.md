# willowPoint audit — 24 November 2026

Scope: review branch, local build and browser flows, public Firestore reads, and Hosting workflow. This is a code and behavior audit, not a claim that the app is launch-ready.

## Phase 1 — repaired on the review branch

| Area | Finding | Change and expected state |
| --- | --- | --- |
| Live feed | A 22 Nov Nepal–UAE sample was displayed as live on 24 Nov. | Frontend now requires a sourced observation within eight minutes. A fresh empty heartbeat says **No tracked matches live**; a missing or expired feed says **Live scores unavailable**; loading says **Checking live scores**. No scheduled collector is active. |
| Source checks | No approved score ingestion exists. | The three-page cross-checking collector (two agreeing observations required) is restored on `main` behind two activation gates: the default branch must be `main`, and the `WILLOWPOINT_INGEST_ENABLED` secret must be set. Every displayed score carries a source URL and check age. Provider terms still restrict automated collection; the durable fix is a permitted provider via `LIVE_PROVIDER_MODULE`. |
| News | Undated, unlinked sample headlines looked current. | Production only displays a story with HTTPS source and publication time in the last seven days. Empty News has an honest state. Sample-mode content is explicitly a demo. |
| Home | Duplicated large news and international stacks buried the fixtures. | Home now orders search, live status, Nepal week, time-limited event/champion feature, and a compact story entry when a current sourced story exists. Discover owns editorial browsing. |
| Discover | Posters had little destination purpose and some led to empty match lists. | Match desk opens the next fixture/recent result; empty Women's/U19 posters toggle Follow; competitions without matches are hidden where appropriate. Browse still uses poster rails. |
| Cue | Every question returned a placeholder. | Bounded live/next fixture/NPL/brief answers now use loaded data and available source links. Unsupported requests say so. This is not a general AI assistant. |
| Actions | Search results and several Profile/news controls were inert. | Search rows navigate; unsourced stories are non-clickable; unsupported settings/edit/alerts controls were replaced with accurate status text. Save and Follow remain interactive. |
| Device preferences | A first remote snapshot could overwrite an in-flight local tap. | Local changes wait to sync until the initial remote read and take precedence during that window. Anonymous Auth is still browser-specific. |
| Visual media | Discover posters depended on remote hotlinks. | Credited Commons poster images are served locally under `public/photos`; credits remain linked. |

## State behavior to verify

| Situation | Expected UI |
| --- | --- |
| Live match verified | Live dot and scores, source link, checked age, multiple-game selector only if needed |
| Confirmed no live matches | Compact no-game panel and next Nepal fixtures below |
| Scraper down, source disagreement, or stale score | Unavailable panel; never represent the old score as live |
| Firestore loading/error | Loading or unavailable message, and honest match-list empty state |
| No upcoming fixtures | All-upcoming selection or a clear empty message |
| No current sourced stories | Hide the Home/Discover story rail; News view explains the gap |
| First-time visitor | Splash, interest onboarding, anonymous browser session; no notification permission or linked-account promise |

## Phase 2 — launch blockers and remaining work

1. **Automatic live feed:** The collector is code-complete and scheduled (every five minutes) but inert until the default branch is `main` **and** the `WILLOWPOINT_INGEST_ENABLED` secret is set. Before activating: run repeated dry runs (`npm run ingest:live:check`) across days, confirm each source's current terms, and set up monitoring and incident handling. A cron cannot guarantee delivery or zero cost at arbitrary scale. Cricbuzz and NDTV prohibit automated collection; Wisden restricts systematic reuse — a permitted provider (`LIVE_PROVIDER_MODULE`) remains the durable answer.
2. **Fixture/result/news pipeline:** Existing Firestore content was seeded from a dated `src/data.js` snapshot. There is no reviewed, permitted, automated source ingestion for these collections. Fixtures and results need an editorial queue, source URLs, dates, corrections, expiry, and source-specific parser checks; current sourced-story gating intentionally leaves News empty until supplied.
3. **Auth and alerts:** Anonymous Auth stores preferences for one browser session/device. Cross-device sign-in, account recovery, push tokens, notification delivery, and preferences for real alerts are not implemented. The interface no longer promises them.
4. **Cue:** Bounded answers are wired to loaded content, but natural-language coverage and source quality require a later retrieval/answer service. Do not market it as general AI yet.
5. **Operations:** Add ingest health alerts, source drift detection, Firestore writes behind staging, incident ownership, rollback, and a verified fixture/result/news publishing path before public launch. The review channel shares the Firebase project, so avoid test writes to production collections.
6. **Accessibility/QA:** Complete keyboard, screen reader, reduced motion, device viewport, network loss, and account/session testing against a deployed review build before promotion. Local smoke checks do not certify all combinations.

## Validation log

- `node --test tests/*.test.mjs`
- `npm run build`
- `npm run ingest:live:check` (read-only dry run; NDTV Sports is not reachable from every network — TLS reset — so the full pipeline was also verified end-to-end against staged fixtures via `WILLOWPOINT_SOURCE_URLS`)
- Browser smoke: Home, Discover, Cue, Profile, match navigation, Save, onboarding choices and completion, and live empty states on local/review builds. Network-loss behavior still needs deployed device testing.

Record exact results and review deployment in the branch history; none of these checks writes Firebase data.
