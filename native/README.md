# willowPoint — native app

Real React Native port of the willowPoint web app (Expo SDK 54, React Native 0.81,
Firebase JS SDK v11). Android first; the iOS build needs Apple Developer
credentials that only the account owner can provide.

## Layout

- `App.js` — providers (SafeArea, Content, CueChat, Prefs) + navigation: four
  tabs (Home, Discover, Cue, You), per-tab native stacks, modal presentations for
  sheets (`SearchAssist`, `Source`) and a transparent modal for sign-out.
- `src/lib/` — data layer. `content.js` (live Firestore listeners),
  `cueChat.js` / `cueEngine.js` (Cue answer path through the Cloudflare proxy
  with an on-device fallback), `userPrefs.js` (AsyncStorage + Firestore
  sync), `navigationRef.js` (imperative openRecord/openSearch/askCue), and the
  pure logic modules shared verbatim with the web app (`search`, `selectors`,
  `statcard`, `innings`, `liveState`, `storyState`, `fixtures`, `cueAnswers`).
- `src/components/`, `src/screens/` — the approved UI, ported token-for-token
  (ebony/crimson/serif, two-stump Cue mascot, approved onboarding flow).
- `assets/` — binary app assets. They are **generated**, not edited by hand:

## Generated artifacts (run `bash native/assets/regen.sh`)

Metro requires PNG flags and the app logo at bundle time, and EAS Build wants
a lockfile. None of these can be pushed through text-only channels, so they are
reproduced from sources already in this repository:

| Generated file                        | Source                              |
| ------------------------------------- | ----------------------------------- |
| `assets/flags/*.png` (13 flags, 96px) | `public/flags/*.svg` via ImageMagick (rsvg delegate) |
| `assets/logo-light.png`             | `public/logo-light.png` (copied)    |
| `package-lock.json`                 | `npm install --package-lock-only` in `native/` |

Requirements: ImageMagick with the rsvg delegate (`imagemagick` +
`librsvg2-bin` on Debian/Ubuntu), Node.js + npm.

## Configure

Copy `.env.example` to `.env` (or set `EXPO_PUBLIC_*` vars) as needed. The
Firebase client config ships with safe public fallbacks identical to the web
app; the Cue proxy URL defaults to the production worker.

Google sign-in activates when a native Google client ID is provided via
`app.json` → `extra.googleClientId` (or `EXPO_PUBLIC_GOOGLE_CLIENT_ID`).
Until then the Google button stays hidden and email/password + anonymous auth
work as on the web.

## Build

```sh
npm install          # in native/
npm start            # Expo dev server
```

Cloud builds (EAS): `preview` profile builds an installable APK;
`production` builds an Android App Bundle. iOS requires Apple Developer
credentials on the Expo account.
