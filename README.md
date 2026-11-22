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

## Data and backend (Firebase)

The app runs in one of two modes:

- **Snapshot mode** (no Firebase config): content comes from [`src/data.js`](src/data.js) and preferences stay on the device. Good for design work.
- **Firebase mode** (config in `.env.local`): content streams live from Firestore, and each fan's saved matches, follows and alert setting sync to their account.

### Set up Firebase (project `willowpoint-ff851`)

1. **Firestore:** Firebase console → Build → Firestore Database → Create database (production mode; `asia-south1` is closest to Nepal).
2. **Auth:** Build → Authentication → Sign-in method → enable **Anonymous**. Every visitor gets a silent account; you can add Google or phone sign-in later and link it without losing their data.
3. **Web app config:** Project settings → Your apps → Web app. Copy `.env.example` to `.env.local` and fill in the values.
4. **Rules:** install the CLI once (`npm i -g firebase-tools`, then `firebase login`) and run `firebase deploy --only firestore:rules`.
5. **Load content:** Project settings → Service accounts → Generate new private key, then:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   npm run seed            # add --clear to wipe content collections first
   ```
   Never commit that key (it's in `.gitignore`).
6. **Deploy the site** to Firebase Hosting: `npm run deploy`.

### Firestore layout

| Path | What | Who can write |
| --- | --- | --- |
| `liveMatches/{id}` | Live score cards (`batting`, `bowling`, `target`, `runRate`, `requiredRate`, `ballsLeft`, `series`, `venue`, `order`) | Admin only |
| `fixtures/{id}` | Upcoming matches (`date` as `YYYY-MM-DD` in NPT, `title`, `time`, `venue`, `competition`, `order`) | Admin only |
| `results/{id}` | Recent results (`label`, `lines[]`, `summary`, `status`, `competition`, `order`) | Admin only |
| `stories/{id}`, `worldNews/{id}` | News cards and list (`order` sets position) | Admin only |
| `config/featured` | The featured card on Home (currently the NPL final). Delete it to hide the card. | Admin only |
| `users/{uid}` | A fan's `saved`, `following`, `alerts` | That fan only |

Content is read-only from the app; update it in the Firebase console or with the Admin SDK (the seed script shows how). Every collection is sorted by its `order` field. "Today" and "Tomorrow" labels follow Nepal time.

## Not wired up yet

- **Cue answers:** the Cue screen shows the question and a placeholder reply. The natural next step is a Firebase Cloud Function that answers from the Firestore content and returns its sources.
- **Live score updates:** Firestore pushes changes to the app instantly, but something still has to write the scores (a scorer using the console, or a function pulling from a data provider).
- **Search, notifications, story and news links:** in place visually; no destinations yet.
- **Story photos:** shown as credited placeholders until the images are licensed and added.
