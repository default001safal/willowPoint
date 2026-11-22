import { useId, useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead } from './ui.jsx';
import { overMarkers } from '../lib/innings.js';
import { mockOverRuns } from '../data.js';

function InningsCard({ match }) {
  const [innings, setInnings] = useState('batting');
  const id = useId();
  const selected = match[innings];
  const overRuns = selected.overRuns ?? mockOverRuns[match.id]?.[innings];
  const markers = overMarkers({ ...selected, overRuns }, match.maxOvers, innings === 'batting');
  const teams = ['batting', 'bowling'];

  const selectWithKeyboard = (event, side) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'batting' : event.key === 'End' ? 'bowling' : teams.find(team => team !== side);
    setInnings(next);
    document.getElementById(`${id}-${next}`)?.focus();
  };

  return (
    <article className="card innings-card" aria-label={`${match.batting.name} v ${match.bowling.name}`}>
      <div className="innings-tabs" role="tablist" aria-label="Choose innings">
        {teams.map(side => {
          const team = match[side];
          return (
            <button
              key={side}
              id={`${id}-${side}`}
              type="button"
              role="tab"
              aria-selected={innings === side}
              aria-controls={`${id}-overs`}
              tabIndex={innings === side ? 0 : -1}
              onClick={() => setInnings(side)}
              onKeyDown={event => selectWithKeyboard(event, side)}
            >
              <span className="innings-score">{team.runs}<span>/{team.wickets}</span></span>
              <span className="innings-label">
                <span className="innings-team">
                  <span className={`innings-role ${side}`} role="img" aria-label={side === 'batting' ? 'Batting' : 'Bowling'} title={side === 'batting' ? 'Batting' : 'Bowling'}>
                    {side === 'batting' ? <I.CricketBat size={14} /> : <I.CricketBall size={14} />}
                  </span>
                  <strong>{team.name}</strong>
                </span>
                <span className="innings-overs">{team.overs} ov</span>
              </span>
            </button>
          );
        })}
      </div>
      <dl className="innings-metrics" aria-label={`${match.batting.name} chase metrics`}>
        <div><dt>Target</dt><dd>{match.target ?? '—'}</dd></div>
        <div><dt><abbr title="Current run rate">CRR</abbr></dt><dd>{match.runRate ?? '—'}</dd></div>
        <div><dt><abbr title="Required run rate">RRR</abbr></dt><dd>{match.requiredRate ?? '—'}</dd></div>
      </dl>
      <div id={`${id}-overs`} role="tabpanel" aria-labelledby={`${id}-${innings}`} tabIndex={0}>
        <span className="sr-only">Runs per over. Green marks completed overs. Red marks the current over. Dashes indicate unavailable totals. Blank circles are upcoming overs.</span>
        <ol className="over-grid" aria-label={`${selected.name} runs per over`}>
          {markers.map(marker => {
            const description = marker.state === 'upcoming'
              ? 'upcoming'
              : `${marker.state}, ${marker.runs === null ? 'runs unavailable' : `${marker.runs} runs`}`;
            return (
              <li key={marker.over} className={`over-marker ${marker.state}`} aria-label={`Over ${marker.over}: ${description}`} title={`Over ${marker.over}: ${description}`}>
                <span aria-hidden="true">{marker.state === 'upcoming' ? '' : marker.runs ?? '—'}</span>
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
    <section className="section" aria-labelledby="live-title">
      <SectionHead title={<span id="live-title">Live now</span>} leading={<span className="live-dot" />}>
        <div className="pager" role="group" aria-label="Live matches">
          {matches.map((item, index) => (
            <button key={item.id} type="button" aria-pressed={item.id === match.id} aria-label={`${item.batting.name} v ${item.bowling.name}`} onClick={() => setSelectedId(item.id)}>
              <span>{index + 1}</span>
            </button>
          ))}
        </div>
      </SectionHead>
      <InningsCard key={match.id} match={match} />
      <button type="button" className="innings-cue" onClick={() => onAskCue(`Talk me through ${match.batting.name} v ${match.bowling.name}`)}>
        <I.SparkGlint size={14} /> Ask Cue
      </button>
    </section>
  );
}
