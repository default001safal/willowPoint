import { useId, useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead } from './ui.jsx';
import { TeamMark } from './TeamMark.jsx';
import { overMarkers } from '../lib/innings.js';
import { mockOverRuns } from '../data.js';

function InningsCard({ match }) {
  const [view, setView] = useState({ innings: 'batting', previous: null, revision: 0 });
  const { innings } = view;
  const selectInnings = side => setView(current => current.innings === side
    ? current
    : { innings: side, previous: current.innings, revision: current.revision + 1 });
  const id = useId();
  const selected = match[innings];
  const overRuns = selected.overRuns ?? mockOverRuns[match.id]?.[innings];
  const markers = overMarkers({ ...selected, overRuns }, match.maxOvers, innings === 'batting');
  const previousTeam = view.previous ? match[view.previous] : null;
  const previousMarkers = previousTeam ? overMarkers({
    ...previousTeam,
    overRuns: previousTeam.overRuns ?? mockOverRuns[match.id]?.[view.previous],
  }, match.maxOvers, view.previous === 'batting') : [];
  const markerText = marker => marker?.state === 'upcoming' ? '' : marker?.runs ?? '—';
  const teams = ['batting', 'bowling'];
  const runsNeeded = match.target != null ? match.target - match.batting.runs : null;
  const chase = runsNeeded != null && runsNeeded > 0 && match.ballsLeft != null ? `${runsNeeded} off ${match.ballsLeft}` : null;

  const selectWithKeyboard = (event, side) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'batting' : event.key === 'End' ? 'bowling' : teams.find(team => team !== side);
    selectInnings(next);
    document.getElementById(`${id}-${next}`)?.focus();
  };

  return (
    <article className="card innings-card" aria-label={`${match.batting.name} v ${match.bowling.name}`}>
      <div className="innings-tabs" role="tablist" aria-label="Choose innings">
        {teams.map(side => {
          const team = match[side];
          const role = side === 'batting' ? 'Batting' : 'Bowling';
          return (
            <button
              key={side}
              id={`${id}-${side}`}
              type="button"
              role="tab"
              aria-selected={innings === side}
              aria-controls={`${id}-overs`}
              tabIndex={innings === side ? 0 : -1}
              onClick={() => selectInnings(side)}
              onKeyDown={event => selectWithKeyboard(event, side)}
            >
              <span className="innings-team">
                <TeamMark name={team.name} size={15} />
                <strong>{team.name}</strong>
                <span className="innings-role" role="img" aria-label={role} title={role}>
                  {side === 'batting' ? <I.CricketBat size={12} /> : <I.CricketBall size={12} />}
                </span>
              </span>
              <span className="innings-score">{team.runs}<span>/{team.wickets}</span></span>
              <span className="innings-overs">{team.overs} ov</span>
            </button>
          );
        })}
      </div>
      <dl className="innings-metrics" aria-label={`${match.batting.name} chase`}>
        {chase && <div className="need"><dt><I.Target size={12} />Need</dt><dd>{chase}</dd></div>}
        <div><dt><I.Trend size={12} /><abbr title="Current run rate">CRR</abbr></dt><dd>{match.runRate ?? '—'}</dd></div>
        <div><dt><I.Gauge size={12} /><abbr title="Required run rate">RRR</abbr></dt><dd>{match.requiredRate ?? '—'}</dd></div>
      </dl>
      <div className="over-caption" aria-hidden="true">
        <span>Runs per over</span>
        <span>{selected.name}</span>
      </div>
      <div id={`${id}-overs`} role="tabpanel" aria-labelledby={`${id}-${innings}`} tabIndex={0}>
        <span className="sr-only">Runs per over. Green marks completed overs, brighter for 10 or more. Red marks the current over. Dashes mean the total is unavailable. Small dots are overs still to come.</span>
        <ol className="over-grid" data-direction={innings} aria-label={`${selected.name} runs per over`}>
          {markers.map(marker => {
            const description = marker.state === 'upcoming'
              ? 'upcoming'
              : `${marker.state}, ${marker.runs === null ? 'runs unavailable' : `${marker.runs} runs`}`;
            return (
              <li key={marker.over} className={`over-marker ${marker.state}${marker.state === 'completed' && marker.runs >= 10 ? ' big' : ''}`} aria-label={`Over ${marker.over}: ${description}`} title={`Over ${marker.over}: ${description}`}>
                <span key={`${view.revision}-${marker.over}`} className={`over-reel${view.previous ? ' rolling' : ''}`} style={{ '--roll-delay': `${((marker.over - 1) % 10) * 12}ms` }} aria-hidden="true">
                  {view.previous && <span className="over-face outgoing">{markerText(previousMarkers[marker.over - 1])}</span>}
                  <span className="over-face incoming">{markerText(marker)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

    </article>
  );
}

export default function LiveSection({ matches, onAskCue }) {
  const [selectedId, setSelectedId] = useState(null);
  const match = matches.find(item => item.id === selectedId) ?? matches[0];
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
      <InningsCard key={match.id} match={match} />
    </section>
  );
}
