import { useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead } from './ui.jsx';
import { MatchupTiles, StatTile, TileGrid } from './StatTiles.jsx';
import { TeamMark } from './TeamMark.jsx';

// First: the two sides facing each other. Then: what the chase needs and how it's going.
function LiveTiles({ match }) {
  const { batting, bowling } = match;
  const need = match.target != null ? match.target - batting.runs : null;
  const chasing = need != null && need > 0 && match.ballsLeft != null;
  const crr = Number(match.runRate);
  const rrr = Number(match.requiredRate);
  const pace = chasing && Number.isFinite(crr) && Number.isFinite(rrr) ? (crr >= rrr ? 'up' : 'down') : 'neutral';
  return (
    <TileGrid label={`${batting.name} v ${bowling.name}`}>
      <MatchupTiles
        sides={[batting, bowling].map((s, i) => ({
          ...s, active: i === 0, mark: <TeamMark name={s.name} size={11} />,
        }))}
      />
      {chasing && <StatTile value={need} unit="Runs" label="To win" badge={`${match.ballsLeft} balls left`} />}
      <StatTile
        value={match.runRate ?? '—'}
        unit="RPO"
        label="Run rate"
        badge={chasing && match.requiredRate ? `need ${match.requiredRate}` : null}
        trend={pace}
      />
    </TileGrid>
  );
}

export default function LiveSection({ matches, onAskCue }) {
  const [selectedId, setSelectedId] = useState(null);
  const match = matches.find((item) => item.id === selectedId) ?? matches[0];
  if (!match) return null;

  return (
    <section className="section live-section" aria-labelledby="live-title">
      <SectionHead title={<span id="live-title">Live now</span>} leading={<span className="live-dot" />}>
        <div className="live-actions">
          {matches.length > 1 && (
            <div className="pager" role="group" aria-label="Live matches">
              {matches.map((item, index) => (
                <button key={item.id} type="button" aria-pressed={item.id === match.id} aria-label={`${item.batting.name} v ${item.bowling.name}`} onClick={() => setSelectedId(item.id)}>
                  <span>{index + 1}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className="innings-cue" onClick={() => onAskCue(`Talk me through ${match.batting.name} v ${match.bowling.name}`)}>
            <I.SparkGlint size={14} /><span><b>Ask</b> Cue</span>
          </button>
        </div>
      </SectionHead>
      <LiveTiles key={match.id} match={match} />
    </section>
  );
}
