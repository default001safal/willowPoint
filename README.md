# willowPoint

A Nepal-first cricket companion: live scores, Nepal's fixtures, the NPL, stories, and quick answers from **Cue**.

This branch is the redesign in the **Quiet accent** style. It's a mobile-first React app built with Vite.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve the build locally
```

## Screens

| Tab | What's on it |
| --- | --- |
| **Home** | Greeting, search, quick-action pills, live match card with a game switcher, Nepal's next matches (calendar strip + list), NPL final, News (Cue quick read + top stories), Around the world |
| **Discover** | Matches / News / Events tabs, competition filters, Today / Upcoming / Recent results |
| **Cue** | Suggested questions and a chat composer (UI only for now, see below) |
| **Profile** | Follows, preferences, match alerts, saved count, about |

## Design system ("Quiet accent")

All tokens live at the top of [`src/styles.css`](src/styles.css).

- **Type:** Space Mono for headings, scores and numbers. Work Sans for everything else.
- **Colour:** Cod Gray `#0A0A0A` background, Catskill White `#F1F5F9` text, Green `#00FF1E` for actions and highlights, Crimson `#C8102E` for anything live or match-day.
- **Rule of thumb:** green means "you can act here", crimson means "happening now". No large solid green areas; primary buttons are off-white.
- **Elevation:** cards, ribbons and inputs sit on `#1A1A1A` with a soft shadow; inner panels use `#262626`.

## Backend (Firebase project `willowpoint-ff851`)

Live site: **https://willowpoint-ff851.web.app**

Everything is set up and running:

- **Firestore** (`asia-south1`, Mumbai) holds the app's content, loaded from [`src/data.js`](src/data.js). The app streams it live, so edits show up instantly.
- **Anonymous sign-in** gives every visitor a silent account. Their saved matches, follows and alert setting sync to `users/{uid}`. Google or phone sign-in can be added later and linked without losing data.
- **Security rules** ([`firestore.rules`](firestore.rules)): anyone can read content; only admins can change it; each fan can read and write only their own preferences doc, with only the expected fields.
- **Hosting** serves the built site from `dist/`.

The web config in [`src/lib/firebase.js`](src/lib/firebase.js) is public by design; the rules are what protect the data. To run the app on the local snapshot instead (no network), set `VITE_FIREBASE_DISABLED=true` in `.env.local`.

### Firestore layout

| Path | What | Who can write |
| --- | --- | --- |
| `liveMatches/{id}` | Live score cards (`batting`, `bowling`, `target`, `runRate`, `requiredRate`, `ballsLeft`, `series`, `venue`, `competition`, `order`) | Admin only |
| `fixtures/{id}` | Upcoming matches (`date` as `YYYY-MM-DD` in NPT, `title`, `time`, `venue`, `competition`, `order`) | Admin only |
| `results/{id}` | Recent results (`label`, `lines[]`, `summary`, `status`, `competition`, `order`) | Admin only |
| `stories/{id}`, `worldNews/{id}` | News cards and list (`order` sets position) | Admin only |
| `config/featured` | The featured card on Home (currently the NPL final). Delete it to hide the card. | Admin only |
| `users/{uid}` | A fan's `saved`, `following`, `alerts` | That fan only |

### Admin commands

These need a service-account key (Firebase console → Project settings → Service accounts). Never commit it; `.gitignore` blocks the usual filenames.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
npm run seed            # reload content from src/data.js (add -- --clear to wipe first)
npm run deploy          # build, then deploy Hosting + Firestore rules (needs firebase-tools)
```

## Not wired up yet

- **Cue answers:** the Cue screen shows the question and a placeholder reply. The natural next step is a Firebase Cloud Function that answers from the Firestore content and returns its sources.
- **Live score updates:** Firestore pushes changes to the app instantly, but something still has to write the scores (a scorer using the console, or a function pulling from a data provider).
- **Search, notifications, story and news links:** in place visually; no destinations yet.
- **Story photos:** shown as credited placeholders until the images are licensed and added.

## Compact innings card

Select a team name or score to switch its over grid. Each marker is an over: neutral is completed, green is current, and an empty outline is upcoming. Optional `batting.overRuns` and `bowling.overRuns` arrays hold nonnegative integer runs, starting with over 1. Missing totals display a dash, and upcoming totals stay hidden. `maxOvers` defaults to 20 and can be supplied for shortened innings.

Run the innings-state checks with `node --test tests/innings.test.mjs`.

The Nepal–UAE UI currently uses explicit mock over totals from `mockOverRuns` in `src/data.js` until that match supplies its own arrays. This does not write mock data to Firestore. The Target / CRR / RRR row always describes the batting team’s chase, while team selection changes the over grid.
