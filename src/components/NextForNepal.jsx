// "Next for Nepal" as stat tiles: the next game leads (white), then the one after.
import { useEffect, useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead, parts } from './ui.jsx';
import { StatTile, TileGrid } from './StatTiles.jsx';
import { TeamMark } from './TeamMark.jsx';
import { useContent } from '../lib/content.jsx';
import { isLiveFixture } from '../lib/fixtures.js';
import { clockTime, kickoffUTC } from '../lib/statcard.js';

const pad = (n) => String(n).padStart(2, '0');
const opponent = (title) => title.replace(/\s+v\s+Nepal$|^Nepal\s+v\s+/i, '');

function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

export default function NextForNepal({ onSeeAll }) {
  const { today, fixtures, liveMatches } = useContent();
  const now = useNow();
  // Today's live game has its own section right above.
  const upcoming = fixtures
    .filter((f) => f.nepal !== false && f.date >= today && !isLiveFixture(f, liveMatches, today))
    // A game whose start time has passed isn't "next" any more, even without live data.
    .filter((f) => (kickoffUTC(f.date, f.time) ?? Infinity) > now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 2);

  return (
    <section className="section" aria-label="Nepal's next matches">
      <SectionHead title="Next for Nepal">
        <button type="button" className="section-link" onClick={onSeeAll}>
          All fixtures <I.ArrowUp size={11} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </SectionHead>
      {upcoming.length === 0 ? (
        <p className="empty" style={{ padding: '4px 4px 0' }}>No Nepal matches scheduled yet.</p>
      ) : (
        <TileGrid label="Upcoming Nepal matches">
          {upcoming.map((f, i) => {
            const p = parts(f.date);
            const clock = clockTime(f.time) ?? 'TBC';
            // Same shape for every game: date, opponent, then start time (NPT) and place.
            return (
              <StatTile
                key={f.id}
                inverse={i === 0}
                value={pad(p.date)}
                unit={p.month}
                mark={<TeamMark name={opponent(f.title)} size={11} />}
                label={`v ${opponent(f.title)}`}
                badge={`${clock} · ${f.venue}`}
                title={f.title}
              />
            );
          })}
        </TileGrid>
      )}
    </section>
  );
}
