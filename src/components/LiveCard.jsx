import { useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead } from './ui.jsx';
import { StatTile, TileGrid } from './StatTiles.jsx';
import { mockOverRuns } from '../data.js';

// Everything the old card showed, as four tiles: score + chase, run rate, overs, opposition.
function LiveTiles({ match }) {
  const { batting, bowling } = match;
  const need = match.target != null ? match.target - batting.runs : null;
  const crr = Number(match.runRate);
  const rrr = Number(match.requiredRate);
  const gap = Number.isFinite(crr) && Number.isFinite(rrr) ? crr - rrr : null;
  const perOver = batting.overRuns ?? mockOverRuns[match.id]?.batting ?? [];
  const best = perOver.length ? Math.max(...perOver) : null;
  const chasing = need != null && need > 0 && match.ballsLeft != null;

  return (
    <TileGrid label={`${batting.name} v ${bowling.name}`}>
      <StatTile inverse value={batting.runs} unit={`/${batting.wickets}`} label={batting.name}
        badge={chasing ? `need ${need} off ${match.ballsLeft}` : `${batting.overs} ov`} />
      <StatTile value={match.runRate ?? '—'} unit="CRR" label="Run rate"
        badge={gap != null ? `${gap >= 0 ? '+' : '−'}${Math.abs(gap).toFixed(2)} vs RRR` : null}
        tone={gap != null && gap < 0 ? 'stop' : 'go'}
        title={match.requiredRate ? `Required rate ${match.requiredRate}` : undefined} />
      <StatTile value={batting.overs} unit={`/${match.maxOvers ?? 20} ov`} label="Overs"
        badge={best != null ? `best over ${best}` : null} />
      <StatTile value={bowling.runs} unit={`/${bowling.wickets}`} label={bowling.name}
        badge={match.target != null ? `target ${match.target}` : `${bowling.overs} ov`} tone="stop" />
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
