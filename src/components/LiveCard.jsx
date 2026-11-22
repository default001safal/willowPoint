import { useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead } from './ui.jsx';

function Team({ team, batting }) {
  return (
    <div className={`team${batting ? ' batting' : ''}`}>
      <div className="team-name">
        <span className="badge" style={{ background: team.color }}>{team.code}</span>
        <span>{team.name}</span>
      </div>
      <div className="score">
        <b style={batting ? undefined : { color: 'var(--text-2)' }}>{team.runs}</b>
        <span>/{team.wickets}</span>
      </div>
      <div className="row-between">
        <span className="overs">{team.overs} overs</span>
        {batting && <span className="tag">BATTING</span>}
      </div>
    </div>
  );
}

export default function LiveSection({ matches, onAskCue }) {
  const [index, setIndex] = useState(0);
  if (!matches.length) return null;
  const m = matches[Math.min(index, matches.length - 1)];
  const need = m.target - m.batting.runs;
  const wktsLeft = 10 - m.batting.wickets;
  const progress = Math.min(100, Math.round((m.batting.runs / m.target) * 100));

  return (
    <section className="section" aria-labelledby="live-title">
      <SectionHead title={<span id="live-title">Live now</span>} leading={<span className="live-dot" />}>
        <div className="pager" role="tablist" aria-label="Live matches">
          {matches.map((match, i) => (
            <button
              key={match.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${match.batting.name} v ${match.bowling.name}`}
              onClick={() => setIndex(i)}
            >
              <span>{i + 1}</span>
            </button>
          ))}
        </div>
      </SectionHead>

      <article className="card live-card">
        <div className="row-between">
          <span className="series">{m.series}</span>
          <span className="meta-inline">
            <I.Pin size={13} />
            {m.venue}
          </span>
        </div>

        <div className="teams">
          <Team team={m.batting} batting />
          <Team team={m.bowling} />
        </div>

        <div className="chase">
          <div className="row-between">
            <strong>
              {m.batting.name} need {need} runs from {m.ballsLeft} balls
            </strong>
            <span className="meta-inline">{wktsLeft} wkts left</span>
          </div>
          <div className="bar" role="progressbar" aria-valuenow={m.batting.runs} aria-valuemin={0} aria-valuemax={m.target} aria-label="Chase progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="stats">
          <div><small>Target</small><b>{m.target}</b></div>
          <div><small>Run rate</small><b>{m.runRate}</b></div>
          <div><small>Req. rate</small><b className="good">{m.requiredRate}</b></div>
        </div>
      </article>

      <button type="button" className="ribbon" onClick={() => onAskCue(`Talk me through ${m.batting.name} v ${m.bowling.name}`)}>
        <span>
          {need} to win · {m.ballsLeft} balls left
        </span>
        <span className="ask">
          <I.Spark size={15} />
          Ask Cue
        </span>
      </button>
    </section>
  );
}
