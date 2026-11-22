// "Next for Nepal": the same fixture rows as Discover's Upcoming list.
import { useEffect, useState } from 'react';
import * as I from './Icons.jsx';
import { SaveButton, SectionHead, parts, relativeDay } from './ui.jsx';
import { MarkPair } from './TeamMark.jsx';
import { useContent } from '../lib/content.jsx';
import { isLiveFixture } from '../lib/fixtures.js';
import { kickoffUTC } from '../lib/statcard.js';


function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

export default function NextForNepal({ onSeeAll, saved = [], toggleSaved = () => {} }) {
  const { today, fixtures, liveMatches } = useContent();
  const now = useNow();
  // Today's live game has its own section right above.
  const upcoming = fixtures
    .filter((f) => f.nepal !== false && f.date >= today && !isLiveFixture(f, liveMatches, today))
    // A game whose start time has passed isn't "next" any more, even without live data.
    .filter((f) => (kickoffUTC(f.date, f.time) ?? Infinity) > now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

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
        // Same rows as Discover's Upcoming list.
        <div className="card">
          {upcoming.map((f) => {
            const p = parts(f.date);
            return (
              <div className="list-row" key={f.id}>
                <div className="date-block"><b>{p.date}</b><small>{p.month}</small></div>
                <div className="row-text">
                  <strong className="with-marks"><MarkPair title={f.title} size={14} />{f.title}</strong>
                  <span>{relativeDay(f.date, today)} · {f.time} · {f.venue}</span>
                </div>
                <SaveButton label={f.title} saved={saved.includes(f.id)} onToggle={() => toggleSaved(f.id)} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
