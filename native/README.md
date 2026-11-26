# willowPoint — React Native app

Native port of willowPoint (Android first, iOS next). Same Firebase backend and
Cue proxy as the web app; no mock data, everything dynamic.

## Layout

- `index.js` / `App.js` — entry point, navigation container, auth gate, onboarding gate.
- `src/theme.js` — ebony/crimson/serif design tokens.
- `src/lib/` — data + logic layer: firebase client, content listeners, Cue chat
  engine + proxy, search/selectors/stat cards/innings/live/story/fixtures/cue answers.
- `src/components/` — CueMark mascot, TeamMark flags, live cards, onboarding, auth.
- `src/screens/` — Home, Discover, Cue chat + Cue answer, Search + Search assist,
  Record detail, Saved, Profile, Account, Source.
- `assets/` — generated binary artifacts (see below). `assets/regen.sh` rebuilds them.
- `app.json` / `eas.json` / `package.json` — Expo SDK 54 config; `preview` profile
  produces an APK, `production` produces an AAB for Play.

## Generated artifacts (not committed as binaries)

Binary blobs don't round-trip through the git tooling used for this repo, so the
derived artifacts live only as outputs of `assets/regen.sh`:

| Artifact                        | Source                                    |
| ------------------------------- | ----------------------------------------- |
| `assets/flags/*.png`            | `public/flags/*.svg` (rendered 96x96)     |
| `assets/logo-light.png`         | `public/logo-light.png` (copied verbatim) |
| `package-lock.json`             | `package.json` (`npm install --package-lock-only`) |

Rebuild them after a fresh clone:

```bash
bash native/assets/regen.sh
```

## Configuration

Environment variables (all optional; Firestore `config/teamLogos` and
`config/feed` are the dynamic source of truth):

- `EXPO_PUBLIC_FIREBASE_*` — override the built-in Firebase client config.
- `EXPO_PUBLIC_CUE_PROXY_URL` — Cue proxy (defaults to the Cloudflare Worker).
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` — native Google sign-in client ID.

Google sign-in additionally requires `extra.googleClientId` in `app.json` (or the
env var above). Until it is set, the Google button stays hidden by design; email /
password and anonymous auth work out of the box.

## Running

```bash
cd native
npm install
npm start            # Expo dev server
```

EAS builds (project `@willowpoint/willowpoint`):

```bash
eas build --profile preview    # APK, installable directly on Android
eas build --profile production # AAB for Google Play
```

iOS builds require Apple Developer credentials (Apple ID with App Store Connect
access, or an App Store Connect API key) that only the account owner can provide.
