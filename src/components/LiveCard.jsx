import { useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead } from './ui.jsx';
import { TeamMark } from './TeamMark.jsx';
import { overMarkers } from '../lib/innings.js';
import { mockOverRuns } from '../data.js';

// Editorial live story: one headline, a quiet two-line scoreboard, a hairline chart of runs per over.
// No card, chips or icons; type and rules carry the structure.
function LiveStory({ match }) {
  const { batting, bowling } = match;
  const overRuns = batting.overRuns ?? mockOverRuns[match.id]?.batting;
  const markers = overMarkers({ ...batting, overRuns }, match.maxOvers, true);
  const current = markers.find((m) => m.state === 'current');
  const peak = Math.max(12, ...markers.map((m) => m.runs ?? 0));
  const need = match.target != null ? match.target - batting.runs : null;
  const chasing = need != null && need > 0 && match.ballsLeft != null;

  const rows = [
    { team: batting, live: true },
    { team: bowling, live: false },
  ];

  return (
    <article className="live-story" aria-label={`${batting.name} v ${bowling.name}`}>
      <p className="live-kicker">{match.short || match.series}<span aria-hidden="true"> · </span>{match.venue}</p>

      {chasing ? (
        <h3 className="live-headline">
          {batting.name} need <span className="num">{need}</span> off <span className="num">{match.ballsLeft}</span>
        </h3>
      ) : (
        <h3 className="live-headline">{batting.name} <span className="num">{batting.runs}/{batting.wickets}</span></h3>
      )}

      <table className="live-board">
        <caption className="sr-only">Scores</caption>
        <tbody>
          {rows.map(({ team, live }) => (
            <tr key={team.name} className={live ? 'is-batting' : undefined}>
              <th scope="row"><span className="team"><span className="mark-slot" style={{ width: 21, height: 14 }}><TeamMark name={team.name} size={14} /></span>{team.name}</span></th>
              <td className="score">{team.runs}/{team.wickets}</td>
              <td className="overs">{team.overs}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <figure className="live-overs">
        <figcaption>
          <span>Runs per over</span>
          {current && <span>Over {current.over} of {match.maxOvers ?? 20}</span>}
        </figcaption>
        <ol aria-label={`${batting.name} runs per over`}>
          {markers.map((m) => (
            <li
              key={m.over}
              className={m.state}
              style={{ '--h': m.runs == null ? 0 : Math.max(0.1, m.runs / peak) }}
              title={m.state === 'upcoming' ? `Over ${m.over}: to come` : `Over ${m.over}: ${m.runs ?? '—'} runs${m.state === 'current' ? ' so far' : ''}`}
            />
          ))}
        </ol>
      </figure>

      <p className="live-rates">
        <span>Target <b>{match.target ?? '—'}</b></span>
        <span><abbr title="Current run rate">CRR</abbr> <b>{match.runRate ?? '—'}</b></span>
        <span><abbr title="Required run rate">RRR</abbr> <b>{match.requiredRate ?? '—'}</b></span>
      </p>
    </article>
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
      <LiveStory key={match.id} match={match} />
    </section>
  );
}
