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

## Data

Everything shown comes from [`src/data.js`](src/data.js), a snapshot of the current build's content (21 Nov). Replace it with live feeds when the data layer is ready; the components only read from that shape.

- `liveMatches` drives the live card. The number switcher shows one entry per live match.
- Saved matches, follows and the match-alerts setting are stored per device (`localStorage`).

## Not wired up yet

- **Cue answers:** the Cue screen shows the question and a placeholder reply until a backend is connected.
- **Search, notifications, story and news links:** in place visually; no destinations yet.
- **Story photos:** shown as credited placeholders until the images are licensed and added.
