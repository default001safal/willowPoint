import { useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead } from './ui.jsx';
import { MatchupTiles, StatTile, TileGrid } from './StatTiles.jsx';
import { TeamMark } from './TeamMark.jsx';

// First: the two sides facing each other. Then: what the chase needs and how it's going.
export function LiveTiles({ match }) {
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
      {chasing && <StatTile value={need} unit={`off ${match.ballsLeft}`} label="To win" badge={`${10 - batting.wickets} wickets left`} title={`${need} runs off ${match.ballsLeft} balls`} />}
      <StatTile
        value={match.runRate ?? '—'}
        unit="Now"
        label="Runs per over"
        badge={chasing && match.requiredRate ? `${match.requiredRate} needed` : null}
        trend={pace}
      />
    </TileGrid>
  );
}

export default function LiveSection({ matches, state, loading, onSeeAll }) {
  const [selectedId, setSelectedId] = useState(null);
  const match = matches.find((item) => item.id === selectedId) ?? matches[0];
  if (!match) {
    const noGame = state === 'none';
    const title = loading ? 'Checking live scores' : noGame ? 'No tracked matches live' : 'Live scores unavailable';
    const detail = loading ? 'Connecting to the score feed.' : noGame ? 'The next Nepal fixture is below.' : 'Scores will appear after a fresh source check.';
    return (
      <section className="section live-section" aria-labelledby="live-title">
        <SectionHead title={<span id="live-title">Live scores</span>}>
          <button type="button" className="section-link" onClick={onSeeAll}>All matches <I.ArrowUp size={11} style={{ transform: 'rotate(45deg)' }} /></button>
        </SectionHead>
        <div className="live-empty" role="status">
          <span className="live-empty-mark" aria-hidden="true"><I.CricketBall size={16} /></span>
          <span><strong>{title}</strong><small>{detail}</small></span>
        </div>
      </section>
    );
  }

  return (
    <section className="section live-section" aria-labelledby="live-title">
      <SectionHead title={<span id="live-title">{state === 'demo' ? 'Demo score' : 'Live now'}</span>} leading={state === 'demo' ? null : <span className="live-dot" />}>
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
          <button type="button" className="section-link" onClick={onSeeAll}>
            See all <I.ArrowUp size={11} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>
      </SectionHead>
      <LiveTiles key={match.id} match={match} />
      {match.verifiedAt && <p className="live-source">Checked {Math.max(0, Math.floor((Date.now() - Date.parse(match.verifiedAt)) / 60_000))}m ago · <a href={match.sourceUrl} target="_blank" rel="noopener noreferrer">{match.source || 'Scorecard'}</a></p>}
    </section>
  );
}
